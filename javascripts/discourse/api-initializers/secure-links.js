import { apiInitializer } from "discourse/lib/api";
import { iconHTML } from "discourse-common/lib/icon-library";
import ExternalLinkConfirm from "../components/modal/external-link-confirm";

const OBSERVER_TIMEOUT_MS = 4000;

export default apiInitializer("1.0", (api) => {
  const currentUser = api.container.lookup("service:current-user");
  const modal = api.container.lookup("service:modal");

  const internalDomains = settings.internal_domains
    .split("|")
    .map((d) => d.trim())
    .filter(Boolean);

  const excludedDomains = settings.excluded_domains
    .split("|")
    .map((d) => d.trim())
    .filter(Boolean);

  const selector = "a[href*='//']:not([href^='/'])";

  const matchesAnyDomain = (domains, url) =>
    domains.some((domain) => url.includes(domain));

  const buildIconElement = (iconName, iconColor) => {
    if (!iconName) {
      return null;
    }

    const wrapper = document.createElement("span");
    wrapper.classList.add(
      "secure-link-icon",
      `secure-link-icon--${settings.link_icon_position}`
    );
    wrapper.innerHTML = iconHTML(iconName);

    if (iconColor) {
      wrapper.style.color = iconColor;
    }

    return wrapper;
  };

  const decorateWithIcon = (link, iconName, iconColor) => {
    if (link.dataset.secureIconApplied) {
      return;
    }

    const iconEl = buildIconElement(iconName, iconColor);
    if (!iconEl) {
      return;
    }

    link.dataset.secureIconApplied = "true";

    if (settings.link_icon_position === "after") {
      link.appendChild(iconEl);
    } else {
      link.insertBefore(iconEl, link.firstChild);
    }
  };

  api.decorateCookedElement(
    (element) => {
      const openConfirmModal = (e, url) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const openInNewTab =
          currentUser?.user_option?.external_links_in_new_tab !== false;

        modal.show(ExternalLinkConfirm, {
          model: { url, openInNewTab },
        });
      };

      const processLink = (link) => {
        if (link.dataset.secureProcessed) {
          return;
        }

        link.dataset.secureProcessed = "true";
        const originalUrl = link.href;

        // Internal links are left untouched.
        if (matchesAnyDomain(internalDomains, originalUrl)) {
          return;
        }

        // Trusted external links only get the trusted icon.
        if (matchesAnyDomain(excludedDomains, originalUrl)) {
          decorateWithIcon(
            link,
            settings.trusted_link_icon,
            settings.trusted_link_icon_color
          );
          return;
        }

        // Anonymous visitors.
        if (!currentUser) {
          if (settings.enable_anonymous_blocking) {
            const loginLink = document.createElement("a");
            loginLink.href = settings.anonymous_redirect_url;
            loginLink.innerText = I18n.t(
              themePrefix("secure_links.login_to_view")
            );
            link.replaceWith(loginLink);
            return;
          }

          decorateWithIcon(
            link,
            settings.external_link_icon,
            settings.external_link_icon_color
          );

          if (settings.enable_exit_confirmation) {
            link.addEventListener("click", (e) =>
              openConfirmModal(e, originalUrl)
            );
          }

          return;
        }

        const trustLevel = currentUser.trust_level;

        // TL0: require the user to reach the required trust level.
        if (trustLevel === 0 && settings.enable_tl0_blocking) {
          const tlLink = document.createElement("a");
          tlLink.href = settings.tl0_redirect_url;
          tlLink.innerText = I18n.t(
            themePrefix("secure_links.first_trust_level_to_view")
          );
          link.replaceWith(tlLink);
          return;
        }

        // TL1: require manual reveal.
        if (trustLevel === 1 && settings.enable_tl1_manual_reveal) {
          const button = document.createElement("button");
          button.type = "button";
          button.innerText = I18n.t(
            themePrefix("secure_links.click_to_view")
          );
          button.classList.add("secure-links");

          button.addEventListener("click", () => {
            const realLink = document.createElement("a");
            realLink.href = originalUrl;
            realLink.innerText = originalUrl;

            decorateWithIcon(
              realLink,
              settings.external_link_icon,
              settings.external_link_icon_color
            );

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

        // Standard external links.
        decorateWithIcon(
          link,
          settings.external_link_icon,
          settings.external_link_icon_color
        );

        if (settings.enable_exit_confirmation) {
          link.addEventListener("click", (e) =>
            openConfirmModal(e, originalUrl)
          );
        }
      };

      const applySecureLinks = (root) => {
        root.querySelectorAll(selector).forEach(processLink);
      };

      applySecureLinks(element);

      // Recheck after async Glimmer rendering.
      setTimeout(() => applySecureLinks(element), 0);

      // Catch links inserted shortly after initial rendering.
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              applySecureLinks(node);
            }
          });
        });
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => observer.disconnect(), OBSERVER_TIMEOUT_MS);
    },
    { id: "secure-link", onlyStream: false }
  );
});
