import Component from "@glimmer/component";
import { action } from "@ember/object";
import DModal from "discourse/components/d-modal";
import DButton from "discourse/components/d-button";
import dIcon from "discourse-common/helpers/d-icon";
import { i18n } from "discourse-i18n";

export default class ExternalLinkConfirm extends Component {

  get leavingConfirmationTitle() {
    return i18n(themePrefix("secure_links.leaving_confirmation_title"));
  }
  
  get leavingConfirmationFirst() {
    return i18n(themePrefix("secure_links.leaving_confirmation_description_first"));
  }

  get leavingConfirmationSecond() {
    return i18n(themePrefix("secure_links.leaving_confirmation_description_second"));
  }

  get leavingConfirmationThird() {
    return i18n(themePrefix("secure_links.leaving_confirmation_description_third"));
  }

  get leavingConfirmationReportHint() {
    return i18n(themePrefix("secure_links.leaving_confirmation_report_hint"));
  }
  
  @action
  proceed() {
    const { url, openInNewTab } = this.args.model;
    
    if (openInNewTab) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
    
    this.args.closeModal();
  }

  @action
  cancel() {
    this.args.closeModal();
  }
  
  <template>
    <DModal
      @title={{this.leavingConfirmationTitle}}
      @closeModal={{@closeModal}}
    >
      <:body>
        <div class="external-link-modal">
          <p class="external-link-modal__disclaimer">
            {{this.leavingConfirmationFirst}}
          </p>
          <p class="external-link-modal__confirmation">
            <span class="external-link-modal__confirmation-title">
              {{this.leavingConfirmationSecond}}
            </span>
            <span class="external-link-modal__confirmation-subtitle">
              {{this.leavingConfirmationThird}} {{dIcon "arrow-down"}}
            </span>
          </p>
          <code class="external-link-modal__url">{{@model.url}}</code>
          <div class="external-link-modal__report-hint">
            {{dIcon "flag"}} {{this.leavingConfirmationReportHint}}
          </div>
        </div>
      </:body>
      <:footer>
        <DButton
          @translatedLabel={{i18n "js.continue"}}
          @action={{this.proceed}}
          @icon="arrow-up-right-from-square"
          class="btn-primary"
        />
        <DButton
          @translatedLabel={{i18n "js.cancel"}}
          @action={{this.cancel}}
          class="btn-flat"
        />
      </:footer>
    </DModal>
  </template>
}