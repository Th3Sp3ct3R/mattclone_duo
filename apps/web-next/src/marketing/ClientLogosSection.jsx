import { Section, SectionBand } from '@julio/ui';

const clientLogos = [
  {
    name: 'Amazon Music',
    src: '/images/clients/amazon_music_logo.webp'
  },
  {
    name: 'J.P. Morgan',
    src: '/images/clients/jp.png'
  },
  {
    name: 'Major League Baseball',
    src: '/images/clients/mlb.png'
  },
  {
    name: 'Tesla',
    src: '/images/clients/tesla.png'
  },
  {
    name: 'USAMRIID',
    src: '/images/clients/usamriid.png'
  }
];

export function ClientLogosSection({ dict, anchorId = 'clients', tone = 'light' }) {
  const eyebrow = dict.home.clientsEyebrow || 'Experience';
  const title = dict.home.clientsTitle || 'Organizations represented in our work';
  const description =
    dict.home.clientsDescription ||
    'Teams and platforms where our experience has contributed to meaningful outcomes.';

  return (
    <SectionBand tone={tone} id={anchorId} className="HomePageAnchor">
      <div
        className={`container content-container HomeClientsArea ${
          tone === 'dark' ? 'HomeClientsArea--dark' : 'HomeClientsArea--light'
        }`}
      >
        <Section eyebrow={eyebrow} title={title} description={description}>
          <div className="HomeClientsGrid" role="list" aria-label="Organizations">
            {clientLogos.map((client) => (
              <div key={client.name} className="HomeClientLogoTile" role="listitem">
                <img className="HomeClientLogoImage" src={client.src} alt={client.name} loading="lazy" />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </SectionBand>
  );
}
