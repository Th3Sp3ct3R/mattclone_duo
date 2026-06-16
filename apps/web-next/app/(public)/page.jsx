import Link from 'next/link';

import { buildLocalePath } from '@julio/shared';
import { Icon } from '@julio/icons';
import { AppFooter, Card, Button, Section, SectionBand } from '@julio/ui';
import { FeaturedBlogsSection } from '@/src/marketing/FeaturedBlogsSection.jsx';
import { buildJsonLdBlocks, buildRouteMetadata, getRouteSeoSettings } from '@/src/seo/metadata.js';
import { getDictionary, getRequestLocale } from '@/src/i18n/server.js';

export async function generateMetadata() {
  const locale = await getRequestLocale();
  const { settings, override } = await getRouteSeoSettings('home');
  return buildRouteMetadata({ settings, override, path: '/', locale });
}

export default async function MarketingHomePage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const currentYear = new Date().getFullYear();
  const { settings, override } = await getRouteSeoSettings('home');
  const jsonLdBlocks = buildJsonLdBlocks(settings, override);
  const footerColumns = [
    {
      title: dict.home.footerCompanyTitle,
      links: [
        { label: dict.nav.contact, href: buildLocalePath('/contact', locale) },
        { label: dict.nav.login, href: buildLocalePath('/login', locale) }
      ]
    },
    {
      title: dict.home.footerResourcesTitle,
      links: [
        { label: dict.nav.blog, href: buildLocalePath('/blog', locale) },
        { label: dict.home.footerSeo, href: buildLocalePath('/seo', locale) }
      ]
    }
  ];

  return (
    <div>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <main className="Main HomeMain">
        <section className="HomeHeroVideo">
          <video
            className="HomeHeroVideoMedia"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/bgvideo.mp4" type="video/mp4" />
          </video>
          <div className="HomeHeroVideoOverlay" aria-hidden="true" />
          <div className="HomeHeroVideoContent container content-container">
            <h1 className="HomeHeroVideoTitle">
              <img
                className="HomeHeroVideoLogo"
                src="/whitejuliologo.png"
                alt="julio"
                loading="eager"
              />
              <span className="HomeHeroVideoWordmark">
                <span>zero</span>
                <span>start</span>
              </span>
            </h1>
          </div>
        </section>

        <SectionBand tone="dark">
          <div className="container content-container">
            <Section
              eyebrow={dict.home.highlightsEyebrow}
              title={dict.home.highlightsTitle}
              description={dict.home.highlightsDescription}
            >
              <div className="HomeFeatureGrid">
                <Card>
                  <div className="HomeCardBadge" aria-hidden="true">
                    <Icon name="check" size={36} />
                  </div>
                  <h3>{dict.home.highlightsCard1Title}</h3>
                  <div className="Kicker">{dict.home.highlightsCard1Description}</div>
                </Card>
                <Card>
                  <div className="HomeCardBadge" aria-hidden="true">
                    <Icon name="users" size={36} />
                  </div>
                  <h3>{dict.home.highlightsCard2Title}</h3>
                  <div className="Kicker">{dict.home.highlightsCard2Description}</div>
                </Card>
                <Card>
                  <div className="HomeCardBadge" aria-hidden="true">
                    <Icon name="seo" size={36} />
                  </div>
                  <h3>{dict.home.highlightsCard3Title}</h3>
                  <div className="Kicker">{dict.home.highlightsCard3Description}</div>
                </Card>
                <Card>
                  <div className="HomeCardBadge" aria-hidden="true">
                    <Icon name="blog" size={36} />
                  </div>
                  <h3>{dict.home.highlightsCard4Title}</h3>
                  <div className="Kicker">{dict.home.highlightsCard4Description}</div>
                </Card>
                <Card>
                  <div className="HomeCardBadge" aria-hidden="true">
                    <Icon name="analytics" size={36} />
                  </div>
                  <h3>{dict.home.highlightsCard5Title}</h3>
                  <div className="Kicker">{dict.home.highlightsCard5Description}</div>
                </Card>
                <Card>
                  <div className="HomeCardBadge" aria-hidden="true">
                    <Icon name="lock" size={36} />
                  </div>
                  <h3>{dict.home.highlightsCard6Title}</h3>
                  <div className="Kicker">{dict.home.highlightsCard6Description}</div>
                </Card>
              </div>
            </Section>
          </div>
        </SectionBand>

        <FeaturedBlogsSection locale={locale} dict={dict} />

          <SectionBand tone="dark">
            <div className="container content-container">
              <Section
                eyebrow={dict.home.stackEyebrow}
                title={dict.home.stackTitle}
                description={dict.home.stackDescription}
              >
                <div className="layout-stack-gap-24">
                  <div className="HomeFeatureGrid">
                    <Card>
                      <h3>{dict.home.stackCard1Title}</h3>
                      <div className="Kicker">{dict.home.stackCard1Description}</div>
                    </Card>
                    <Card>
                      <h3>{dict.home.stackCard2Title}</h3>
                      <div className="Kicker">{dict.home.stackCard2Description}</div>
                    </Card>
                    <Card>
                      <h3>{dict.home.stackCard3Title}</h3>
                      <div className="Kicker">{dict.home.stackCard3Description}</div>
                    </Card>
                  </div>
                  <div className="layout-stack-gap-12">
                    <h3>{dict.home.packageTitle}</h3>
                    <div className="Kicker">{dict.home.packageDescription}</div>
                    <div className="HomeFeatureGrid">
                      <Card>
                        <div className="HomeCardBadge" aria-hidden="true">
                          <Icon name="dashboard" size={18} />
                        </div>
                        <h3>{dict.home.packageCard1Title}</h3>
                        <div className="Kicker">{dict.home.packageCard1Meta}</div>
                        <div className="Kicker">{dict.home.packageCard1Description}</div>
                      </Card>
                      <Card>
                        <div className="HomeCardBadge" aria-hidden="true">
                          <Icon name="seo" size={18} />
                        </div>
                        <h3>{dict.home.packageCard2Title}</h3>
                        <div className="Kicker">{dict.home.packageCard2Meta}</div>
                        <div className="Kicker">{dict.home.packageCard2Description}</div>
                      </Card>
                      <Card>
                        <div className="HomeCardBadge" aria-hidden="true">
                          <Icon name="analytics" size={18} />
                        </div>
                        <h3>{dict.home.packageCard3Title}</h3>
                        <div className="Kicker">{dict.home.packageCard3Meta}</div>
                        <div className="Kicker">{dict.home.packageCard3Description}</div>
                      </Card>
                    </div>
                  </div>
                  <div className="layout-stack-gap-12">
                    <h3>{dict.home.workflowTitle}</h3>
                    <div className="Kicker">{dict.home.workflowDescription}</div>
                    <div className="HomeFeatureGrid">
                      <Card>
                        <div className="HomeCardBadge" aria-hidden="true">
                          <Icon name="search" size={18} />
                        </div>
                        <h3>{dict.home.workflowCard1Title}</h3>
                        <div className="Kicker">{dict.home.workflowCard1Description}</div>
                      </Card>
                      <Card>
                        <div className="HomeCardBadge" aria-hidden="true">
                          <Icon name="dashboard" size={18} />
                        </div>
                        <h3>{dict.home.workflowCard2Title}</h3>
                        <div className="Kicker">{dict.home.workflowCard2Description}</div>
                      </Card>
                      <Card>
                        <div className="HomeCardBadge" aria-hidden="true">
                          <Icon name="analytics" size={18} />
                        </div>
                        <h3>{dict.home.workflowCard3Title}</h3>
                        <div className="Kicker">{dict.home.workflowCard3Description}</div>
                      </Card>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </SectionBand>

        <SectionBand tone="dark">
          <div className="container content-container">
            <Section
              eyebrow={dict.home.readyEyebrow}
              title={dict.home.readyTitle}
              description={dict.home.readyDescription}
              actions={
                <>
                  <Link href={buildLocalePath('/login', locale)}>
                    <Button>{dict.home.readyPrimaryCta}</Button>
                  </Link>
                  <Button variant="secondary">{dict.home.readySecondaryCta}</Button>
                </>
              }
            />
          </div>
        </SectionBand>
      </main>

      <AppFooter
        containerClassName="container content-container"
        brand={
          <div className="AppFooterBrand">
            <img className="AppFooterLogo" src="/whitejuliologo.png" alt="julio" />
          </div>
        }
        tagline={dict.home.footerTagline}
        columns={footerColumns}
        copyright={`© ${currentYear} julio. ${dict.home.footerRights}`}
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />
    </div>
  );
}

