import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import { BRAND } from "./_brand";

interface BrandedEmailProps {
  preview: string;
  title: string;
  intro?: string;
  bodyText?: string | React.ReactNode;
  ctaLabel?: string;
  ctaUrl?: string;
  securityNotice?: string;
  children?: React.ReactNode;
}

/**
 * The single branded email layout used by every OPSQAI email.
 * Email-specific templates only override title / body / CTA / extra children.
 */
export function BrandedEmail({
  preview,
  title,
  intro,
  bodyText,
  ctaLabel,
  ctaUrl,
  securityNotice,
  children,
}: BrandedEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img
              src={BRAND.logoUrl}
              alt={BRAND.productName}
              height={28}
              style={{ display: "block" }}
            />
          </Section>

          <Section style={card}>
            <Heading as="h1" style={h1}>
              {title}
            </Heading>
            {intro ? <Text style={textMuted}>{intro}</Text> : null}
            {bodyText ? (
              typeof bodyText === "string" ? (
                <Text style={text}>{bodyText}</Text>
              ) : (
                bodyText
              )
            ) : null}
            {children}
            {ctaLabel && ctaUrl ? (
              <Section style={{ textAlign: "left", margin: "24px 0 8px" }}>
                <Button href={ctaUrl} style={button}>
                  {ctaLabel}
                </Button>
              </Section>
            ) : null}
            {ctaUrl ? (
              <Text style={textTiny}>
                If the button doesn't work, copy this link into your browser:
                <br />
                <Link href={ctaUrl} style={inlineLink}>
                  {ctaUrl}
                </Link>
              </Text>
            ) : null}
          </Section>

          {securityNotice ? (
            <Section style={notice}>
              <Text style={noticeText}>{securityNotice}</Text>
            </Section>
          ) : null}

          <Section style={supportSection}>
            <Text style={textTiny}>
              Need help? Contact{" "}
              <Link href={`mailto:${BRAND.supportEmail}`} style={inlineLink}>
                {BRAND.supportEmail}
              </Link>
              .
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerLine}>
              <Link href={BRAND.website} style={footerLink}>
                {BRAND.website.replace("https://", "")}
              </Link>
              {" · "}
              <Link href={`${BRAND.website}/legal/privacy`} style={footerLink}>
                Privacy
              </Link>
              {" · "}
              <Link href={`${BRAND.website}/legal/terms`} style={footerLink}>
                Terms
              </Link>
            </Text>
            <Text style={footerCopy}>
              © {new Date().getFullYear()} {BRAND.productName} · {BRAND.tagline}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: BRAND.colors.bodyBg,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: 0,
  color: BRAND.colors.text,
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 24px",
};

const headerSection: React.CSSProperties = {
  padding: "0 0 24px",
};

const card: React.CSSProperties = {
  border: `1px solid ${BRAND.colors.border}`,
  borderRadius: "12px",
  padding: "28px 28px 24px",
  backgroundColor: "#ffffff",
};

const h1: React.CSSProperties = {
  fontSize: "22px",
  lineHeight: "30px",
  fontWeight: 600,
  color: BRAND.colors.text,
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};

const text: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: BRAND.colors.text,
  margin: "0 0 12px",
};

const textMuted: React.CSSProperties = {
  ...text,
  color: BRAND.colors.muted,
};

const textTiny: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: BRAND.colors.muted,
  margin: "12px 0 0",
};

const button: React.CSSProperties = {
  backgroundColor: BRAND.colors.primary,
  color: BRAND.colors.primaryFg,
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 20px",
  textDecoration: "none",
  display: "inline-block",
};

const notice: React.CSSProperties = {
  marginTop: "16px",
  padding: "12px 14px",
  border: `1px solid ${BRAND.colors.border}`,
  borderRadius: "10px",
  backgroundColor: BRAND.colors.surface,
};

const noticeText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: BRAND.colors.muted,
  margin: 0,
};

const supportSection: React.CSSProperties = {
  marginTop: "16px",
};

const hr: React.CSSProperties = {
  borderColor: BRAND.colors.border,
  margin: "24px 0 12px",
};

const footerSection: React.CSSProperties = {
  padding: "0 4px",
};

const footerLine: React.CSSProperties = {
  fontSize: "11px",
  lineHeight: "18px",
  color: BRAND.colors.muted,
  margin: "0 0 4px",
};

const footerCopy: React.CSSProperties = {
  fontSize: "11px",
  lineHeight: "18px",
  color: BRAND.colors.muted,
  margin: 0,
};

const inlineLink: React.CSSProperties = {
  color: BRAND.colors.primary,
  textDecoration: "underline",
};

const footerLink: React.CSSProperties = {
  color: BRAND.colors.muted,
  textDecoration: "underline",
};
