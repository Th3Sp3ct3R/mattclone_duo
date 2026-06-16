import { loadRootEnv } from '@julio/config/env';
import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';
import { Post } from '@julio/api/models/post';

loadRootEnv();

const MIN_PLAINTEXT_LENGTH = Number(process.env.BLOG_LONGFORM_MIN_LENGTH || 1200);

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeTitle(title = '') {
  return String(title).replace(/\s+/g, ' ').trim();
}

function getPrimaryTopic(title = '') {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) return 'this topic';
  return normalizedTitle.split(':')[0]?.trim() || normalizedTitle;
}

function buildLongformHtml({ title, excerpt }) {
  const primaryTopic = getPrimaryTopic(title);
  const safeTitle = normalizeTitle(title) || 'Long-form guide';
  const safeExcerpt = String(excerpt || '').trim();
  const introLead =
    safeExcerpt || `This guide breaks down how to approach ${primaryTopic} with clarity and measurable outcomes.`;

  const sections = [
    `<p>${introLead}</p>`,
    `<p>Rather than chasing trends, the focus is on aligning the work to business goals, clear ownership, and simple execution steps that compound over time.</p>`,
    `<h2>Start with the outcome</h2>`,
    `<p>Before tactics, define the business outcome you need and the behavior that signals success. This prevents the plan from turning into a checklist with no impact.</p>`,
    `<p>Write the outcome in plain language, then align the scope and timeline to it. When the goal is clear, prioritization becomes straightforward.</p>`,
    `<h2>Scope the first sprint</h2>`,
    `<p>Long-form initiatives still need a tight first sprint. Use it to validate the direction, remove unclear assumptions, and ship a version that can be measured.</p>`,
    `<ol>
      <li>Define the single most important metric to improve.</li>
      <li>Map the user journey and pick the highest-leverage step.</li>
      <li>Ship the smallest version that proves the direction works.</li>
    </ol>`,
    `<h2>Build the supporting system</h2>`,
    `<p>Great execution requires a supporting system: documentation, ownership, and feedback loops. This is where most teams lose momentum.</p>`,
    `<p>Assign a single owner, define how updates are communicated, and set a weekly cadence for reviewing results and removing blockers.</p>`,
    `<h3>Checklist for consistency</h3>`,
    `<ul>
      <li>One owner who publishes progress each week.</li>
      <li>A short backlog tied directly to the goal.</li>
      <li>Clear definitions for what is in or out of scope.</li>
      <li>Metrics reviewed on a fixed schedule.</li>
    </ul>`,
    `<h2>Common pitfalls to avoid</h2>`,
    `<p>The biggest pitfall is over-scoping early. Another is optimizing for vanity metrics that do not move the business forward.</p>`,
    `<p>Keep feedback loops tight and remove work that does not show a measurable lift. Focused momentum beats scattered activity.</p>`,
    `<blockquote>Progress compounds when the team can explain what they are building, why it matters, and how it is measured.</blockquote>`,
    `<h2>How to keep momentum</h2>`,
    `<p>Once the initial results are in, expand the work by doubling down on what performed best. Avoid adding new channels or tactics without evidence.</p>`,
    `<p>Document learnings and turn them into standards so the next sprint starts stronger than the last.</p>`,
    `<h2>Next actions</h2>`,
    `<p>Summarize the top three decisions you made, the metric you will move, and the first shipment date. Then align the team and execute.</p>`,
    `<p>If the work stays focused on the outcome, ${safeTitle.toLowerCase()} becomes a repeatable playbook instead of a one-off effort.</p>`
  ];

  return sections.join('');
}

export async function patchBlogLongform() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  await connectMongo(process.env.MONGODB_URI);

  const posts = await Post.find({}).lean();
  let updatedCount = 0;

  for (const post of posts) {
    const currentPlaintextLength = stripHtml(post.contentHtml).length;
    if (currentPlaintextLength >= MIN_PLAINTEXT_LENGTH) continue;

    const contentHtml = buildLongformHtml({
      title: post.title,
      excerpt: post.excerpt
    });

    await Post.updateOne({ _id: post._id }, { $set: { contentHtml } });
    updatedCount += 1;
  }

  await disconnectMongo();
  console.log(`[patch] blog longform applied to ${updatedCount} post(s)`);
}

const isDirect = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirect) {
  patchBlogLongform().catch(async (err) => {
    console.error(err);
    try {
      await disconnectMongo();
    } catch {}
    process.exit(1);
  });
}
