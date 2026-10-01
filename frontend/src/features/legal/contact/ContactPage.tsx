import { useState } from "react";

import PageContainer from "../../../components/layout/PageContainer";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/ui/Button";
import Divider from "../../../components/ui/Divider";
import Reveal from "../../../components/motion/Reveal";
import PageTransition from "../../../components/motion/PageTransition";

import "./contact.css";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type Status = "idle" | "submitting" | "success" | "error";

const initialForm: FormState = {
  name: "",
  email: "",
  subject: "General",
  message: "",
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function DiscordIcon() {
  return (
    <svg
      className="contact-discord-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="contact-x-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<Status>("idle");

  const update =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Enter your name.";
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!form.message.trim() || form.message.trim().length < 10)
      next.message = "Say a little more — at least 10 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject,
          message: form.message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to send your message.",
        );
      }

      setStatus("success");
      setForm(initialForm);
      setErrors({});
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("error");
    }
  };

  return (
    <PageTransition>
      <PageContainer className="info-page">
        <Reveal>
          <PageHeader
            eyebrow="CONTACT"
            title="Get in touch"
            description="Questions, bug reports, partnership pitches — send them our way. We read every message, especially during a race weekend."
          />
        </Reveal>

        <Reveal delay="short">
          <section className="contact-body">
            <div className="contact-info">
              <div className="contact-info-block">
                <h2>Email</h2>
                {/* placeholder — replace with real address */}
                <a href="mailto:f1racevision.contact@gmail.com">
                  f1racevision.contact@gmail.com
                </a>
                <p>
                  For support, bug reports, press and partnership enquiries. We
                  typically replay within 1–2 business days, but it may take longer during a race weekend.
                </p>
                
              </div>

              <Divider />
              <div className="contact-info-block">
                <h2>Community</h2>
                <p className="contact-discord">
                  <DiscordIcon />
                  <span>Discord</span>
                  <span className="contact-soon">Coming soon</span>
                </p>
                <p>A place to talk races, share feedback and follow updates.</p>
              </div>

              <div className="contact-info-block">
                                <h2>Follow us</h2>
                <p className="contact-discord">
                  <XIcon />
                  <a
                    href="https://x.com/f1racevision"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    X / Twitter
                  </a>
                </p>
                <p>Follow us on X for updates and new features.</p>
              </div>
            </div>


            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="contact-form-row">
                <div className="contact-field">
                  <label htmlFor="c-name">Name</label>
                  <input
                    id="c-name"
                    type="text"
                    value={form.name}
                    onChange={update("name")}
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name && (
                    <p className="contact-field-error">{errors.name}</p>
                  )}
                </div>

                <div className="contact-field">
                  <label htmlFor="c-email">Email</label>
                  <input
                    id="c-email"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && (
                    <p className="contact-field-error">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="c-subject">Subject</label>
                <select
                  id="c-subject"
                  value={form.subject}
                  onChange={update("subject")}
                >
                  <option>General</option>
                  <option>Support</option>
                  <option>Partnership</option>
                  <option>Press</option>
                </select>
              </div>

              <div className="contact-field">
                <label htmlFor="c-message">Message</label>
                <textarea
                  id="c-message"
                  value={form.message}
                  onChange={update("message")}
                  aria-invalid={Boolean(errors.message)}
                />
                {errors.message && (
                  <p className="contact-field-error">{errors.message}</p>
                )}
              </div>

              <div className="contact-form-footer">
                <Button type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "Sending…" : "Send message"}
                </Button>
                {status === "success" && (
                  <span className="contact-form-status" data-state="success">
                    Message sent successfully. We'll get back to you soon.
                  </span>
                )}
                {status === "error" && (
                  <span className="contact-form-status">
                    Something went wrong. Try again.
                  </span>
                )}
              </div>
            </form>
          </section>
        </Reveal>
      </PageContainer>
    </PageTransition>
  );
}