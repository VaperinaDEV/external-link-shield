import { apiInitializer } from "discourse/lib/api";
import ExternalLinkConfirm from "../components/modal/external-link-confirm";

export default apiInitializer((api) => {
  
  const currentUser = api.container.lookup("service:current-user");
  const modal = api.container.lookup("service:modal");

  api.decorateCookedElement(
    (element) => {

      // Select all external links except internal domains and relative paths
      const forumDomain = settings.forum_domain;
      const excludedDomains = settings.excluded_domains.split("|");

      // Build selector to exclude the forum's own domain
      let selector = "a[href*='//']:not([href^='/'])";

      if (forumDomain) {
        selector += `:not([href*='${forumDomain.trim()}'])`;
      }
      
      const links = element.querySelectorAll(selector);

      // Open Confirm Modal Handle
      const openConfirmModal = (e, url) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const openInNewTab = currentUser?.external_links_in_new_tab !== false;

        modal.show(ExternalLinkConfirm, {
          model: {
            url: url,
            openInNewTab: openInNewTab
          }
        });
      };

      links.forEach((link) => {
        const originalUrl = link.href;

        // Skip trusted (excluded) domains - CSS will handle the lock icon
        const isExcluded = excludedDomains.some(d => d.trim() && originalUrl.includes(d.trim()));
        if (isExcluded) {
          return;
        }

        // Redirect anonymous users to login
        if (!currentUser && settings.enable_anonymous_blocking) {
          const loginLink = document.createElement("a");
          loginLink.href = settings.anonymous_redirect_url;
          loginLink.innerText = I18n.t(themePrefix("secure_links.login_to_view"));
          link.replaceWith(loginLink);
          return;
        }

        const trustLevel = currentUser.trust_level;

        // TL0: Show info link to trust levels
        if (trustLevel === 0 && settings.enable_tl0_blocking) {
          const tlLink = document.createElement("a");
          tlLink.href = settings.tl0_redirect_url;
          tlLink.innerText = I18n.t(themePrefix("secure_links.first_trust_level_to_view"));
          link.replaceWith(tlLink);
          return;
        }

        // TL1: Manual reveal required
        if (trustLevel === 1 && settings.enable_tl1_manual_reveal) {
          const button = document.createElement("a");
          button.innerText = I18n.t(themePrefix("secure_links.click_to_view"));
          button.classList.add("secure-links");

          button.addEventListener("click", () => {
            const realLink = document.createElement("a");
            realLink.href = originalUrl;
            realLink.innerText = originalUrl;

            if (settings.enable_exit_confirmation) {
              realLink.addEventListener("click", (ev) =>
                openConfirmModal(ev, originalUrl)
              );
            }

            button.replaceWith(realLink);
          });

          link.replaceWith(button);
          return;
        }

        // TLs: Standard links with exit confirmation
        if (settings.enable_exit_confirmation) {
          link.addEventListener("click", (e) =>
            openConfirmModal(e, originalUrl)
          );
        }
      });
    },
    { id: "secure-link", onlyStream: true }
  );
});