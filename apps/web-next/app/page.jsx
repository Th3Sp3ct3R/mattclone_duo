import Link from 'next/link';

import { buildLocalePath } from '@julio/shared';
import { Icon } from '@julio/icons';
import {
  AppHeader,
  AppHeaderNav,
  ScrollRevealHeader,
  AppFooter,
  Card,
  Section,
  SectionBand
} from '@julio/ui';
import { ChatPageContext } from '@/src/chat/ChatPageContext.jsx';
import { ClientLogosSection } from '@/src/marketing/ClientLogosSection.jsx';
import { ContactSection } from '@/src/marketing/ContactSection.jsx';
import { FeaturedBlogsSection } from '@/src/marketing/FeaturedBlogsSection.jsx';
import { MotionItem, MotionSection, MotionStagger } from '@/src/marketing/HomeMotion.jsx';
import { ProfilesSection } from '@/src/marketing/ProfilesSection.jsx';
import { buildJsonLdBlocks, buildRouteMetadata, getRouteSeoSettings } from '@/src/seo/metadata.js';
import { LocaleSwitcher } from '@/src/i18n/LocaleSwitcher.jsx';
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
  const chatPageContext = {
    pageName: 'Marketing home',
    sections: ['package', 'contact', 'highlights', 'blog', 'profiles', 'clients']
  };
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
      <ChatPageContext context={chatPageContext} />
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <ScrollRevealHeader className="AppShellHeader AppShellHeader--home">
        <div className="container AppShellHeaderInner">
          <AppHeader
            brand={
              <div className="c-AppHeaderBrand AppHeaderBrandLogo" role="banner">
                <img
                  className="AppHeaderLogo AppHeaderLogo--light"
                  src="/whitejuliologo.png"
                  alt="julio"
                  loading="eager"
                />
                <img
                  className="AppHeaderLogo AppHeaderLogo--dark"
                  src="/blackjuliologo.png"
                  alt="julio"
                  loading="eager"
                />
                <span className="AppHeaderLogoWordmark ui-BrandWordmark">
                  <span>zero</span>
                  <span>start</span>
                </span>
              </div>
            }
            actions={
              <div className="layout-inline-gap-12 layout-inline-center">
                <AppHeaderNav
                  links={[
                    { label: dict.nav.blog, href: '#blog' },
                    { label: dict.nav.contact, href: '#contact' }
                  ]}
                  scrollSpyAnchors={['#blog', '#contact']}
                />
                <LocaleSwitcher />
              </div>
            }
          />
        </div>
      </ScrollRevealHeader>

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
          <MotionSection className="HomeHeroVideoContent container content-container">
            <MotionItem>
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
            </MotionItem>
          </MotionSection>
        </section>

        <SectionBand tone="dark">
          <div className="container content-container HomeServiceArea" id="package">
            <MotionSection>
              <Section
                eyebrow={dict.home.packageEyebrow}
                title={dict.home.packageTitle}
                description={dict.home.packageDescription}
              >
                <MotionStagger className="HomeFeatureGrid">
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="dashboard" size={115} />
                      </div>
                      <h3>{dict.home.packageCard1Title}</h3>
                      <div className="Kicker">{dict.home.packageCard1Meta}</div>
                      <div className="Kicker">{dict.home.packageCard1Description}</div>
                    </Card>
                  </MotionItem>
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="seo" size={115} />
                      </div>
                      <h3>{dict.home.packageCard2Title}</h3>
                      <div className="Kicker">{dict.home.packageCard2Meta}</div>
                      <div className="Kicker">{dict.home.packageCard2Description}</div>
                    </Card>
                  </MotionItem>
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="analytics" size={115} />
                      </div>
                      <h3>{dict.home.packageCard3Title}</h3>
                      <div className="Kicker">{dict.home.packageCard3Meta}</div>
                      <div className="Kicker">{dict.home.packageCard3Description}</div>
                    </Card>
                  </MotionItem>
                </MotionStagger>
              </Section>
            </MotionSection>
          </div>
        </SectionBand>

        <MotionSection>
          <ClientLogosSection dict={dict} tone="light" />
        </MotionSection>

        <MotionSection>
          <ProfilesSection dict={dict} tone="dark" />
        </MotionSection>

        <MotionSection>
          <FeaturedBlogsSection locale={locale} dict={dict} anchorId="blog" />
        </MotionSection>


        <SectionBand tone="dark">
           <div className="container content-container HomeHighlightsArea">
            <MotionSection>
              <Section
                eyebrow={dict.home.highlightsEyebrow}
                title={dict.home.highlightsTitle}
                description={dict.home.highlightsDescription}
              >
                <MotionStagger className="HomeFeatureGrid">
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="check" size={56} />
                      </div>
                      <h3>{dict.home.highlightsCard1Title}</h3>
                      <div className="Kicker">{dict.home.highlightsCard1Description}</div>
                    </Card>
                  </MotionItem>
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="users" size={56} />
                      </div>
                      <h3>{dict.home.highlightsCard2Title}</h3>
                      <div className="Kicker">{dict.home.highlightsCard2Description}</div>
                    </Card>
                  </MotionItem>
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="seo" size={56} />
                      </div>
                      <h3>{dict.home.highlightsCard3Title}</h3>
                      <div className="Kicker">{dict.home.highlightsCard3Description}</div>
                    </Card>
                  </MotionItem>
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="blog" size={56} />
                      </div>
                      <h3>{dict.home.highlightsCard4Title}</h3>
                      <div className="Kicker">{dict.home.highlightsCard4Description}</div>
                    </Card>
                  </MotionItem>
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="analytics" size={56} />
                      </div>
                      <h3>{dict.home.highlightsCard5Title}</h3>
                      <div className="Kicker">{dict.home.highlightsCard5Description}</div>
                    </Card>
                  </MotionItem>
                  <MotionItem>
                    <Card>
                      <div className="HomeCardBadge" aria-hidden="true">
                        <Icon name="lock" size={56} />
                      </div>
                      <h3>{dict.home.highlightsCard6Title}</h3>
                      <div className="Kicker">{dict.home.highlightsCard6Description}</div>
                    </Card>
                  </MotionItem>
                </MotionStagger>
              </Section>
            </MotionSection>
          </div>
        </SectionBand>

        <MotionSection>
          <ContactSection anchorId="contact" />
        </MotionSection>
        
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

