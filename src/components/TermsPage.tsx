export function TermsPage() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-[#ffd700]">Demo Notice &amp; Terms</h1>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <p className="text-sm font-bold text-red-400 mb-2">⚠️ DEMO ONLY — NO REAL MONEY</p>
        <p className="text-xs text-white/60 leading-relaxed">
          Marble Rush Arena is a <strong>free demo</strong> for entertainment purposes only.
          All credits are demo credits with no real-world value. There is no:
        </p>
        <ul className="text-xs text-white/50 mt-2 space-y-1 list-disc list-inside">
          <li>Real-money betting or gambling</li>
          <li>Deposits or withdrawals</li>
          <li>Cash prizes or rewards</li>
          <li>Ability to convert demo credits to real money</li>
          <li>Skill-based wagering or consideration</li>
        </ul>
      </div>

      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-bold text-white/80">How It Works</h2>
        <p className="text-xs text-white/40 leading-relaxed">
          You receive free demo credits when you sign up. Use them to pick a marble before each race.
          If your chosen marble wins in the physics simulation, you earn more demo credits.
          Race results are determined by a 3D physics simulation and seeded for consistency.
        </p>
        <p className="text-xs text-white/40 leading-relaxed">
          This is a game demo to showcase 3D web physics technology. 
          No purchase necessary. No real money involved.
        </p>
      </div>

      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-bold text-white/80">Fairness &amp; Transparency</h2>
        <p className="text-xs text-white/40 leading-relaxed">
          Each race is assigned a <strong>seed number</strong> at creation time, visible in the race data.
          The seed deterministically influences the physics simulation, meaning the same seed should
          produce the same race outcome under identical physics conditions.
        </p>
        <p className="text-xs text-white/40 leading-relaxed">
          The winning marble and full finish order are stored on the server after each race.
          You can verify your race results against the server record.
        </p>
      </div>

      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-bold text-white/80">Credits</h2>
        <p className="text-xs text-white/40 leading-relaxed">
          Demo credits are a free in-game score only. They cannot be:
        </p>
        <ul className="text-xs text-white/50 mt-1 space-y-1 list-disc list-inside">
          <li>Purchased with real money</li>
          <li>Withdrawn or cashed out</li>
          <li>Transferred between accounts</li>
          <li>Converted to any real-world value</li>
        </ul>
        <p className="text-xs text-white/40 leading-relaxed mt-2">
          Admin reserves the right to adjust demo credit balances at any time.
        </p>
      </div>

      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-bold text-white/80">Future Development</h2>
        <p className="text-xs text-white/40 leading-relaxed">
          Real-money features may be added in the future only after proper legal review,
          licensing, age verification, geolocation checks, and compliance with all applicable
          gambling regulations in each jurisdiction. This demo version is a technology preview
          and should not be interpreted as an active gambling service.
        </p>
      </div>

      <p className="text-[10px] text-white/20 text-center">
        Marble Rush Arena v1.0.0 — Demo Mode
      </p>
    </div>
  );
}
