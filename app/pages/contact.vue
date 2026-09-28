<template>
  <AppContainer as="main" narrow class="contact">
    <ContentPageHeader
      eyebrow="Concierge · Mon–Sat 9:00–19:00 WAT"
      title="Speak with the house."
    />

    <a
      class="luxe-card concierge"
      :href="whatsappUrl"
      target="_blank"
      rel="noopener"
    >
      <span class="concierge__ring">
        <span class="concierge__dot" />
      </span>

      <span class="concierge__body">
        <span class="display-heading concierge__title">WhatsApp a specialist</span>
        <span class="concierge__note">Typically replies in under 10 minutes</span>
      </span>

      <span class="concierge__arrow" aria-hidden="true">&rarr;</span>
    </a>

    <div class="contact__details">
      <ContentDetailRow label="Phone" :value="CONCIERGE.phone" />
      <ContentDetailRow label="Email" :value="CONCIERGE.email" />
      <ContentDetailRow label="Instagram" :value="CONCIERGE.instagram" />
      <ContentDetailRow label="Private viewings" :value="CONCIERGE.viewings" />
    </div>

    <AppForm v-model="formValid" class="contact__form" @submit="send" @invalid="nudge">
      <p class="mono-meta">Or write to us</p>

      <AppInput
        v-model="form.name"
        label="Name"
        placeholder="Your name"
        autocomplete="name"
        :rules="nameRules"
        required
      />

      <AppInput
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        :rules="emailRules"
        required
      />

      <AppTextarea
        v-model="form.message"
        label="Message"
        placeholder="How can we help?"
        :rows="3"
        :rules="messageRules"
        required
      />

      <AppButton type="submit" block>Send</AppButton>
    </AppForm>
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * The concierge page: WhatsApp first, then the facts, then a form.
 *
 * TODO(launch): every contact detail below is the design prototype's
 * placeholder. The real number, address and handle belong in `site_settings`
 * (admin → settings, Phase E) — `SOCIAL_INSTAGRAM` in
 * app/utils/constants/brand.ts is still an empty string on purpose. Replace
 * all five before go-live; do not ship a fake number as if it dialled.
 */
const CONCIERGE = {
  phone: "+234 800 000 0000",
  /** Digits only, no `+` — what wa.me expects. */
  whatsapp: "2348000000000",
  email: "hello@jewelrybox.ng",
  instagram: "@jewelrybox.ng",
  viewings: "Lekki, Lagos · by appointment",
} as const;

const whatsappUrl = `https://wa.me/${CONCIERGE.whatsapp}?text=${encodeURIComponent(
  "Hello JewelryBox — I would like to speak with a specialist.",
)}`;

const form = ref({ name: "", email: "", message: "" });
const formValid = ref(false);

const messageRules = [...requiredRules, minLength(10), maxLength(1200)];

/**
 * TODO(backend): `server/api/contact.post.ts` (vendor email + rate limit) is
 * the backend lane's, per CHECKLIST.md Phase F. Until it exists this does NOT
 * pretend to send anything over the wire — it validates, acknowledges and
 * resets. No fake latency, no fake failure.
 */
const send = () => {
  useToast("success", "Message sent. We reply within the hour.");
  form.value = { name: "", email: "", message: "" };
};

const nudge = () => {
  useToast("error", "Add your name, a working email and a message.");
};

usePageSeo({
  title: "Contact the Concierge",
  description:
    "Speak with a JewelryBox specialist on WhatsApp, by phone or by email. Private viewings in Lekki, Lagos by appointment.",
  path: "/contact",
  jsonLd: breadcrumbSchema([{ name: "Contact", path: "/contact" }]),
});
</script>

<style scoped>
.contact {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-block: 24px 64px;
}

/* ── WhatsApp card ───────────────────────────────────────────────────── */

.concierge {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-color: var(--accent);
  color: var(--text-primary);
  text-decoration: none;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.concierge:hover {
  opacity: 0.82;
}

.concierge:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

/* `.corner-brackets` draws two, on opposite corners. The prototype's
   concierge card carries exactly one, top-left, so it is drawn here. */
.concierge::before {
  content: "";
  position: absolute;
  top: -1px;
  left: -1px;
  width: 10px;
  height: 10px;
  border-top: 1px solid var(--accent);
  border-left: 1px solid var(--accent);
  pointer-events: none;
}

.concierge__ring {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--text-primary);
  border-radius: 50%;
}

.concierge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  animation: jbPulse 2s ease infinite;
}

.concierge__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.concierge__title {
  font-size: 20px;
  line-height: 1.2;
}

.concierge__note {
  font-size: 12px;
  color: var(--text-secondary);
}

.concierge__arrow {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

/* ── Details & form ─────────────────────────────────────────────────── */

.contact__details {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border-default);
}

.contact__form {
  gap: 22px;
}
</style>
