import {
  buildAuthorizedAccountImportPlan,
  parseAuthorizedAccountManifest
} from './authorized-account-manifest.js';

test('parses authorized account manifests with secret references', () => {
  const rows = parseAuthorizedAccountManifest(`platform,username,email,password_secret_ref,email_password_secret_ref,totp_secret_ref,device_name
instagram,opencoven.ai,owner@example.com,keychain:ig-opencoven-password,keychain:ig-opencoven-email,keychain:ig-opencoven-totp,SxarH
youtube,OpenCoven,owner@example.com,env:YOUTUBE_TEST_PASSWORD,,env:YOUTUBE_TEST_TOTP,FpPU2
`);

  expect(rows).toEqual([
    {
      line: 2,
      platform: 'instagram',
      username: 'opencoven.ai',
      email: 'owner@example.com',
      secretRefs: {
        password: 'keychain:ig-opencoven-password',
        emailPassword: 'keychain:ig-opencoven-email',
        totp: 'keychain:ig-opencoven-totp'
      },
      deviceName: 'SxarH',
      tags: []
    },
    {
      line: 3,
      platform: 'youtube',
      username: 'OpenCoven',
      email: 'owner@example.com',
      secretRefs: {
        password: 'env:YOUTUBE_TEST_PASSWORD',
        emailPassword: '',
        totp: 'env:YOUTUBE_TEST_TOTP'
      },
      deviceName: 'FpPU2',
      tags: []
    }
  ]);
});

test('rejects manifests that include raw credential columns', () => {
  expect(() =>
    parseAuthorizedAccountManifest(`platform,username,password,device_name
tiktok,my_test_account,plain-text-password,SxarH
`)
  ).toThrow(/Raw credential column "password" is not allowed/);
});

test('rejects secret fields that are not keychain or env references', () => {
  expect(() =>
    parseAuthorizedAccountManifest(`platform,username,password_secret_ref,device_name
tiktok,my_test_account,plain-text-password,SxarH
`)
  ).toThrow(/must start with keychain: or env:/);
});

test('builds account docs and blocks duplicate platform assignments on one device', () => {
  const devices = [
    {
      _id: 'device-1',
      provider: 'duoplus',
      providerDeviceId: 'SxarH',
      name: 'Duo SxarH',
      providerMeta: {
        subscriptionVerified: true,
        subscriptionStatus: 'active'
      }
    }
  ];
  const existingAccounts = [
    {
      _id: 'account-1',
      platform: 'instagram',
      assignedDeviceId: 'device-1',
      retiredAt: null,
      credentials: { username: 'existing_ig' }
    }
  ];
  const rows = parseAuthorizedAccountManifest(`platform,username,password_secret_ref,device_name,tags
instagram,new_ig,keychain:new-ig-password,SxarH,opencoven;test
youtube,new_channel,keychain:new-youtube-password,SxarH,opencoven
`);

  const plan = buildAuthorizedAccountImportPlan({ rows, devices, existingAccounts });

  expect(plan.errors).toEqual([
    {
      line: 2,
      code: 'DEVICE_PLATFORM_ACCOUNT_EXISTS',
      message: 'Device SxarH already has existing_ig assigned for instagram.'
    }
  ]);
  expect(plan.accounts).toEqual([
    {
      line: 3,
      filter: { platform: 'youtube', 'credentials.username': 'new_channel' },
      doc: {
        platform: 'youtube',
        status: 'new',
        credentials: {
          username: 'new_channel',
          password: '',
          email: '',
          emailPassword: '',
          secretRefs: {
            password: 'keychain:new-youtube-password',
            emailPassword: '',
            totp: ''
          }
        },
        assignedDeviceId: 'device-1',
        tags: ['authorized-import', 'opencoven']
      }
    }
  ]);
});
