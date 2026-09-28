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
      // TODO: wire to the real endpoint, e.g.:
      // await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(form),
      // });
      await new Promise((resolve) => setTimeout(resolve, 700)); // stubbed
      setStatus("success");
      setForm(initialForm);
    } catch {
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
                <a href="mailto:support@f1racevision.com">
                  support@f1racevision.com
                </a>
                <p>We typically reply within 1 business day.</p>
              </div>

              <Divider />

              <div className="contact-info-block">
                <h2>Press &amp; partnerships</h2>
                <a href="mailto:press@f1racevision.com">
                  press@f1racevision.com
                </a>
                <p>For media requests and collaboration proposals.</p>
              </div>

              <Divider />

              <div className="contact-info-block">
                <h2>Elsewhere</h2>
                <p>
                  <a href="#">X / Twitter</a> · <a href="#">Instagram</a>
                </p>
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
                    Sent — we'll be in touch soon.
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