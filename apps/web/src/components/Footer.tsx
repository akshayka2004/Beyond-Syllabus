import Link from "next/link";
import { Instagram, Linkedin, Youtube } from "lucide-react";
import { DinoMark } from "./illustrations";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.8 21H1.6l7.5-8.6L1.2 3h6.6l4.5 5.6L17.5 3zm-1.1 16.1h1.8L7.7 4.8H5.8l10.6 14.3z" />
  </svg>
);

const socials = [
  { href: "https://instagram.com", label: "Instagram", Icon: Instagram },
  { href: "https://x.com", label: "X", Icon: XIcon },
  { href: "https://linkedin.com", label: "LinkedIn", Icon: Linkedin },
  { href: "https://youtube.com", label: "YouTube", Icon: Youtube },
];

export function Footer() {
  return (
    <footer className="bs-footer">
      <div className="bs-wrap">
        <div className="bs-footer-top">
          <div>
            <div className="bs-footer-brand">
              <p className="bs-footer-logo">
                BEYOND
                <br />
                SYLLABUS
              </p>
              <DinoMark className="h-[74px] w-[74px] text-primary" />
            </div>
            <div className="bs-socials">
              {socials.map(({ href, label, Icon }) => (
                <Link key={label} href={href} target="_blank" aria-label={label}>
                  <Icon className="h-[19px] w-[19px]" />
                </Link>
              ))}
            </div>
          </div>

          <p className="bs-footer-tag">
            We Broke Silence.
            <br />
            Now We Shape Tomorrow.
          </p>
        </div>

        <hr className="bs-footer-rule" />
        <p className="bs-copyright">
          {new Date().getFullYear()} Beyond Syllabus. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
