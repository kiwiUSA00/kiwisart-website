// Leaderboard settings. Fill in after creating your Supabase project (see README.md).
// Leave both empty to run the game without a leaderboard.
// These two values are meant to be public (the database rules in supabase.sql limit what visitors can do).
window.TALLY_CONFIG = {
  url: 'https://azdlmhgpjdasrcuoboia.supabase.co',
  key: 'sb_publishable_91Slzmuf7Tqwyun2PXTjDg_wrfoVTGv',
  // Google Analytics 4 measurement ID (public). Remove this line to turn analytics off.
  ga: 'G-VX9PJ92T7J',
  // Google AdSense (website only). An ad shows inside the "Puzzle complete" card.
  adsense: 'ca-pub-1918382369099424',
  // Display ad unit ID from AdSense (Ads > By ad unit > Display ads), the number in data-ad-slot="...".
  adSlot: '9753280555',
  // Turn on once AdSense shows kiwisart.com as "Ready" and adSlot is filled in: ads: true, adsTest: false.
  // Preview Google's test ads any time at https://kiwisart.com/tally/?adtest=1
  ads: false,
  adsTest: true,
  // Google's full-screen ads between levels (needs H5 Games Ads approval). Off.
  adBreaks: false
};
