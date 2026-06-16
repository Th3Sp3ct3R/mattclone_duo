import { notFound } from 'next/navigation';

import { formatEventDateTime } from '@julio/events';
import { SectionBand } from '@julio/ui';
import { buildRouteMetadata, getRouteSeoSettings } from '@/src/seo/metadata.js';
import { getDictionary, getRequestLocale } from '@/src/i18n/server.js';
import { getPublicEventBySlug } from '@/src/server/events.js';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return {};
  const locale = await getRequestLocale();

  const { settings } = await getRouteSeoSettings('events-detail');
  if (!settings) return {};

  const override = {
    title: event.title,
    description: event.summary || '',
    canonicalUrl: '',
    ogTitle: event.title,
    ogDescription: event.summary || '',
    indexable: true
  };

  return buildRouteMetadata({
    settings,
    override,
    path: `/events/${event.slug}`,
    locale
  });
}

export default async function EventDetailPage({ params }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return notFound();
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);

  return (
    <div>
      <main>
        <SectionBand tone="light">
          <div className="container content-container">
            <div className="EventDetailHeader">
              <div className="Kicker">{formatEventDateTime(event)}</div>
              <h1>{event.title}</h1>
              {event.summary ? <p className="Kicker">{event.summary}</p> : null}
              {event.location ? (
                <div className="EventDetailMeta">
                  <strong>{dict.events.locationLabel}</strong>
                  <div className="Kicker">{event.location}</div>
                </div>
              ) : null}
            </div>
          </div>
        </SectionBand>

        <SectionBand tone="dark">
          <div className="container content-container">
            <div
              className="EventDetailBody"
              dangerouslySetInnerHTML={{ __html: event.descriptionHtml || '' }}
            />
          </div>
        </SectionBand>
      </main>
    </div>
  );
}
