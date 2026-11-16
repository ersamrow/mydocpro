import { trustForTool } from "../src/trust-claims.js";
export default function TrustBadges({ toolId, claims = trustForTool(toolId) }) {
  const badges = [
    claims.free !== false && "100% Free",
    claims.noSignup !== false && "No sign-up",
    claims.noWatermark !== false && "No watermark",
    claims.limit || (claims.noDailyLimit !== false && "No daily limit"),
    claims.localFiles !== false && "Files never leave your device",
  ].filter(Boolean);
  return <ul className="trust-badges" aria-label="Tool benefits">
    {badges.map(badge => <li key={badge} title={badge === claims.limit ? claims.limitDetails : undefined}>
      <span aria-hidden="true">✓</span>{badge}
    </li>)}
  </ul>;
}
