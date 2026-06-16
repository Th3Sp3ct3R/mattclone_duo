import { ProfileCard, Section, SectionBand } from '@julio/ui';

const profiles = [
  {
    key: 'matthew',
    imageUrl: '/images/profiles/matt.png',
    imageAlt: 'Matthew Elia'
  },
  {
    key: 'enrique',
    imageUrl: null,
    imageAlt: 'Enrique Calas'
  },
  {
    key: 'alexander',
    imageUrl: '/images/profiles/alex.png',
    imageAlt: 'Alexander Capio'
  }
];

export function ProfilesSection({ dict, anchorId = 'profiles', tone = 'light', showSpecialists = false }) {
  const managingPartners = profiles.filter(
    (profile) => dict.home.profiles[profile.key].role === 'Managing Partner, Zero Start'
  );
  const otherProfiles = profiles.filter(
    (profile) => dict.home.profiles[profile.key].role !== 'Managing Partner, Zero Start'
  );

  const otherProfilesTitle = dict.home.profilesOtherTitle || 'Specialists';

  return (
    <SectionBand tone={tone} id={anchorId} className="HomePageAnchor">
      <div
        className={`container content-container HomeProfilesArea ${
          tone === 'dark' ? 'HomeProfilesArea--dark' : 'HomeProfilesArea--light'
        }`}
      >
        <Section
          eyebrow={dict.home.profilesEyebrow}
          title={dict.home.profilesTitle}
          description={dict.home.profilesDescription}
        >
          <div className="HomeProfilesGroup">
            <div className="HomeProfilesGrid HomeProfilesGrid--managingPartners">
              {managingPartners.map((profile) => (
                <ProfileCard
                  key={profile.key}
                  className="HomeProfilesCard"
                  name={dict.home.profiles[profile.key].name}
                  role={dict.home.profiles[profile.key].role}
                  bio={dict.home.profiles[profile.key].bio}
                  imageUrl={profile.imageUrl}
                  imageAlt={profile.imageAlt}
                />
              ))}
            </div>
          </div>
          {showSpecialists ? (
            <div className="HomeProfilesGroup">
              <h3 className="HomeProfilesGroupTitle">{otherProfilesTitle}</h3>
              <div className="HomeProfilesGrid HomeProfilesGrid--specialists">
                {otherProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.key}
                    className="HomeProfilesCard"
                    name={dict.home.profiles[profile.key].name}
                    role={dict.home.profiles[profile.key].role}
                    bio={dict.home.profiles[profile.key].bio}
                    imageUrl={profile.imageUrl}
                    imageAlt={profile.imageAlt}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </Section>
      </div>
    </SectionBand>
  );
}
