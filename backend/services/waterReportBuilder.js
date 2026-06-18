function buildFallbackAiReport(context) {
  const h = context.hydration || {};
  const today = h.today || {};
  const name = context.userName || "there";
  const goal = h.goalLiters ?? 2.4;
  const liters = today.totalLiters ?? 0;
  const pct = today.percentage ?? 0;
  const weekTotal = h.weekTotalLiters ?? 0;
  const avg = h.avgDailyLiters ?? 0;
  const weekday = h.weekdayAvgLiters ?? 0;
  const weekend = h.weekendAvgLiters ?? 0;
  const days = h.last7Days || [];
  const goalHitDays = days.filter((d) => (d.totalLiters || 0) >= goal).length;
  const orders = context.orders || {};
  const subs = context.subscriptions || {};

  const overview =
    liters === 0
      ? `Hi ${name}, you haven't logged water today yet. Over the past week you've averaged ${avg}L per day across ${days.length} days.`
      : `Hi ${name}, you're at ${liters}L today (${pct}% of your ${goal}L goal). This week you've logged ${weekTotal}L total with a ${avg}L daily average.`;

  const sections = [
    {
      title: "Today's Status",
      content:
        liters === 0
          ? "No intake logged yet today. Start with a glass of water now and log it in the app to begin tracking."
          : pct >= 100
            ? `You've reached your ${goal}L goal for today — excellent work. Keep light sips through the evening to stay comfortable.`
            : `You're ${today.remainingLiters ?? Math.max(0, goal - liters)}L away from your goal. Spread the remaining intake across the next few hours rather than drinking it all at once.`,
    },
    {
      title: "Weekly Pattern",
      content:
        goalHitDays >= 5
          ? `Strong week — you hit your goal on ${goalHitDays} of ${days.length} days. Your consistency is building a healthy hydration habit.`
          : goalHitDays >= 2
            ? `You met your goal on ${goalHitDays} of ${days.length} days this week. Logging daily will help spot patterns faster.`
            : `Hydration logging has been light this week. Try setting a morning reminder to log your first glass each day.`,
    },
    {
      title: "Hydration Insights",
      content:
        weekend > 0 && weekday > weekend + 0.3
          ? `Weekday intake (${weekday}L avg) is noticeably higher than weekends (${weekend}L). A Saturday morning reminder could help balance this.`
          : weekend > weekday + 0.3
            ? `Weekend intake (${weekend}L avg) runs higher than weekdays (${weekday}L). Consider carrying a bottle on workdays too.`
            : `Your weekday and weekend averages are fairly balanced. Focus on steady logging to keep improving.`,
    },
    {
      title: "Orders & Plans",
      content:
        orders.activeCount > 0
          ? `You have ${orders.activeCount} active order(s) and ${subs.activeCount || 0} subscription plan(s). Track deliveries from your dashboard for seamless refills.`
          : subs.activeCount > 0
            ? `You have ${subs.activeCount} active subscription plan(s). Your regular delivery schedule supports consistent hydration at home.`
            : orders.recentCount > 0
              ? `Your last order was ${orders.lastOrder?.status || "completed"}. Consider a subscription plan for hassle-free regular delivery.`
              : "No recent orders yet. Browse plans or place an order when you need fresh water delivery.",
    },
  ];

  const highlights = [];
  if (pct >= 100) highlights.push("Today's hydration goal achieved");
  if (goalHitDays >= 4) highlights.push(`${goalHitDays} goal days this week`);
  if (avg >= goal * 0.85) highlights.push(`Strong weekly average of ${avg}L`);
  if (orders.activeCount > 0) highlights.push(`${orders.activeCount} active delivery order(s)`);
  if (highlights.length === 0) highlights.push("Keep logging to unlock deeper AI insights");

  const recommendations = [];
  if (pct < 70) recommendations.push("Log one more glass before evening to close today's hydration gap.");
  if (weekend < weekday) recommendations.push("Set a weekend morning reminder to match your weekday intake.");
  if (days.filter((d) => d.totalLiters > 0).length < 4) recommendations.push("Log water daily for a more accurate AI report next time.");
  if (subs.activeCount === 0 && orders.recentCount === 0) recommendations.push("Explore subscription plans for regular water delivery at home.");
  if (recommendations.length === 0) recommendations.push("Great consistency — keep your current hydration rhythm going.");

  return {
    headline: pct >= 100 ? "Great hydration day!" : liters > 0 ? "You're making progress" : "Time to hydrate",
    overview,
    sections,
    highlights: highlights.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
  };
}

module.exports = { buildFallbackAiReport };
