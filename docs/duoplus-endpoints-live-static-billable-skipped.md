# DuoPlus Endpoint Discovery Report

Generated: 2026-07-10T13:58:53.091Z

## Authentication provenance

Authentication was freshly captured through chrome-cdp:9223 and validated with `/account/profile` before the session file was written.

Validation result: live verified (HTTP 200); validated at: 2026-07-10T13:58:52.354Z.

No tokens, cookies, raw headers, credentials, phone numbers, device identifiers, or response values are included in this report or its machine-readable artifact.

## Summary

- Static client endpoints: `67`
- Total inventory endpoints: `108`
- Live verified: `21`
- Authentication failed: `0`
- Unavailable: `0`
- State-changing: `35`
- Billable: `8`
- Untested: `44`
- Endpoints blocked by safety policy: `15`

Safety classification takes precedence over verification. Unknown, state-changing, and billable endpoints are blocked before transmission by the discovery command.

## Inventory

| Method | Endpoint | Classification | Verification | Status | Request fields | Response fields | Static |
|---|---|---|---|---|---|---|---|
| OPTIONS | `/account/checkUserStatus` | untested | untested | 204 | - | - | no |
| POST | `/account/checkUserStatus` | live verified | live verified | 200 | - | code, data, data.isNewUser, message | no |
| GET | `/account/cloudPhone` | live verified | live verified | 200 | - | code, data, data.cloud_extend_storage, data.cloud_storage_duration_id, data.cloud_storage_expired_at, data.cloud_storage_product_id, data.cloud_storage_renewal_status, data.cloud_storage_total, data.cloud_storage_used, data.duration, data.duration.left, data.duration.left_gift, data.duration.left_recharge, data.duration.per_month, data.duration.total_gift, data.duration.total_recharge, data.duration.used_gift, data.duration.used_recharge, data.image, data.image.count, data.image.list, data.image.list.count, data.image.list.name, data.image.list.os, data.image.list.region_id, data.image.list.used_count, data.image.used_count, data.is_expired, data.package_cloud_storage_id, data.phone, data.phone.count, data.phone.list, data.phone.list.count, data.phone.list.name, data.phone.list.os, data.phone.list.region_id, data.phone.list.used_count, data.phone.used_count, data.phone_switch, message | no |
| OPTIONS | `/account/cloudPhone` | untested | untested | 204 | - | - | no |
| OPTIONS | `/account/columnsConfigList` | untested | untested | - | - | - | no |
| POST | `/account/columnsConfigList` | untested | untested | - | - | - | no |
| OPTIONS | `/account/filterConfigList` | untested | untested | - | - | - | no |
| POST | `/account/filterConfigList` | untested | untested | - | page_key | - | no |
| OPTIONS | `/account/profile` | untested | untested | 204 | - | - | no |
| POST | `/account/profile` | live verified | live verified | 200 | - | code, data, data.account_type, data.email, data.google_email, data.has_password, data.is_leader, data.is_sub_admin, data.is_team_creator, data.team_id, data.team_list, data.team_list.id, data.team_list.image_count, data.team_list.is_creator, data.team_list.is_leader, data.team_list.name, data.team_list.sub_admin, data.team_name, data.tfa, data.tfa.level, data.tfa.list, data.tfa.list.id, data.tfa.list.value, data.tfa.status, data.tfa.tfa_default_level, data.user_id, data.username, message | no |
| OPTIONS | `/account/userLabel` | untested | untested | - | - | - | no |
| POST | `/account/userLabel` | untested | untested | - | - | - | no |
| POST | `/api/v1/app/install` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/app/installedList` | untested | untested | - | - | - | yes |
| POST | `/api/v1/app/list` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.list.id, data.list.name, data.list.pkg, data.list.version_list, data.list.version_list.id, data.list.version_list.name, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/app/start` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/app/stop` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/app/teamList` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/app/uninstall` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/automation/addPlan` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/automation/deletePlan` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/automation/planList` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/automation/savePlan` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/automation/setPlanStatus` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudDisk/delFiles` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudDisk/list` | live verified | live verified | 200 | page, pagesize | code, data, data.limit, data.list, data.offset, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/cloudDisk/pushFiles` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudDisk/signedUrl` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudNumber/imageWriteSms` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudNumber/numberList` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.list.created_at, data.list.expired_at, data.list.id, data.list.phone_number, data.list.region_name, data.list.remark, data.list.renewal_status, data.list.status_name, data.list.type_name, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/cloudNumber/purchase` | billable | untested | - | - | - | yes |
| POST | `/api/v1/cloudNumber/renewal` | billable | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/addToGroup` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/batchRoot` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/closeAdb` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/command` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/createGroup` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/deleteGroup` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/groupList` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/cloudPhone/info` | untested | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/initProxy` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/linkUserList` | live verified | live verified | 200 | - | code, data, data.list, data.list.nickname, data.list.user_id, message | yes |
| POST | `/api/v1/cloudPhone/list` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.list.adb, data.list.adb_password, data.list.area, data.list.created_at, data.list.expired_at, data.list.group, data.list.id, data.list.ip, data.list.name, data.list.os, data.list.remark, data.list.size, data.list.status, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/cloudPhone/moveToGroup` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/newPhone` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/openAdb` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/powerOff` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/powerOn` | billable | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/purchase` | billable | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/renewal` | billable | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/resolutionList` | live verified | live verified | 200 | - | code, data, data.list, message | yes |
| POST | `/api/v1/cloudPhone/restart` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/scan` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/status` | untested | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/tagList` | live verified | live verified | 200 | - | code, data, data.list, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/cloudPhone/updateGroup` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/cloudPhone/updateSharePassword` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/mobile/languageList` | live verified | live verified | 200 | - | code, data, data.id, data.name, message | yes |
| POST | `/api/v1/mobile/modelList` | untested | untested | 200 | - | code, message | yes |
| POST | `/api/v1/mobile/timezoneList` | untested | untested | 200 | - | code, message | yes |
| POST | `/api/v1/proxy/add` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/proxy/check` | untested | untested | 200 | proxy_ids | code, message | yes |
| POST | `/api/v1/proxy/delete` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/proxy/list` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.list.area, data.list.group_ids, data.list.group_name, data.list.host, data.list.id, data.list.name, data.list.port, data.list.user, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/proxy/refresh` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/proxy/update` | state-changing | untested | - | - | - | yes |
| POST | `/api/v1/subscriptionStartup/list` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.list.cpu, data.list.created_at, data.list.expired_at, data.list.free_status, data.list.id, data.list.name, data.list.need_renewal, data.list.ram, data.list.remark, data.list.renewal_status, data.list.rom, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/api/v1/subscriptionStartup/purchase` | billable | untested | - | - | - | yes |
| POST | `/api/v1/subscriptionStartup/renewal` | billable | untested | - | - | - | yes |
| POST | `/api/v1/team/order` | live verified | live verified | 200 | page, pagesize | code, data, data.list, data.page, data.pagesize, data.total, data.total_page, message | yes |
| OPTIONS | `/chat/groupList` | untested | untested | - | - | - | no |
| POST | `/chat/groupList` | untested | untested | - | - | - | no |
| OPTIONS | `/common/getOption` | untested | untested | - | - | - | no |
| POST | `/common/getOption` | untested | untested | - | filter | - | no |
| GET | `/common/notice` | untested | untested | - | - | - | no |
| OPTIONS | `/common/notice` | untested | untested | - | - | - | no |
| OPTIONS | `/common/notification` | untested | untested | - | - | - | no |
| POST | `/common/notification` | untested | untested | - | - | - | no |
| GET | `/common/userNoviceGuide` | untested | untested | - | - | - | no |
| OPTIONS | `/common/userNoviceGuide` | untested | untested | - | - | - | no |
| POST | `/image/batchCapture2` | untested | untested | - | - | - | yes |
| POST | `/image/batchHeartbeat` | state-changing | untested | - | - | - | yes |
| POST | `/image/connect` | state-changing | untested | - | - | - | yes |
| POST | `/image/connectTokenShared` | state-changing | untested | - | - | - | yes |
| POST | `/image/controlList` | live verified | live verified | 200 | group_id, keyword, page, pagesize, region_type_id | code, data, data.list, data.list.id, data.list.in_backup, data.list.link_status, data.list.name, data.list.os, data.list.status, data.list.supplier_type, data.page, data.pagesize, data.total, data.total_page, message | yes |
| OPTIONS | `/image/groupList` | untested | untested | 204 | - | - | no |
| POST | `/image/groupList` | live verified | live verified | 200 | - | code, data, data.list, data.page, data.pagesize, data.total, data.total_page, message | no |
| POST | `/image/heartbeat` | state-changing | untested | - | - | - | yes |
| OPTIONS | `/image/list` | untested | untested | 204 | - | - | no |
| POST | `/image/list` | live verified | live verified | 200 | fid, group_id, link_status, page, pagesize | code, data, data.list, data.list.adb_ip, data.list.adb_port, data.list.adb_status, data.list.area, data.list.check_info, data.list.check_info.checked_at, data.list.check_info.city, data.list.check_info.country, data.list.check_info.ip, data.list.check_info.latitude, data.list.check_info.longitude, data.list.check_info.region, data.list.check_info.status, data.list.check_info.success, data.list.check_info.timezone, data.list.check_info.zipcode, data.list.convert_version_times, data.list.created_at, data.list.expired_at, data.list.expired_days, data.list.group_name, data.list.id, data.list.in_backup, data.list.ip, data.list.is_default, data.list.is_dynamic_proxy, data.list.is_free, data.list.is_init, data.list.is_new, data.list.link_status, data.list.link_user, data.list.linked_at, data.list.name, data.list.need_config_proxy, data.list.need_renewal, data.list.new_mock_times, data.list.number_id, data.list.os, data.list.phone_id, data.list.phone_name, data.list.phone_number, data.list.proxy_id, data.list.proxy_info_format, data.list.proxy_refresh_url, data.list.region_name, data.list.remark, data.list.renewal_status, data.list.share_auth, data.list.share_code, data.list.share_phone_type, data.list.share_status, data.list.size, data.list.start_phone_type, data.list.status, data.list.status_name, data.list.sup_type, data.list.supplier_region_id, data.list.tag_name, data.list.task_progress, data.list.task_progress_seconds, data.list.type_name, data.list.user_group_name, data.page, data.pagesize, data.total, data.total_page, message | yes |
| POST | `/image/start` | billable | untested | - | - | - | yes |
| POST | `/image/startCheck` | untested | untested | - | - | - | yes |
| OPTIONS | `/image/tagList` | untested | untested | - | - | - | no |
| POST | `/image/tagList` | untested | untested | - | pagesize | - | no |
| GET | `/image/windowSetting` | live verified | live verified | 200 | - | code, data, data.window_setting, data.window_setting.height, data.window_setting.scale, data.window_setting.type, data.window_setting.width, message | no |
| OPTIONS | `/image/windowSetting` | untested | untested | 204 | - | - | no |
| GET | `/operation/popover` | untested | untested | - | - | - | no |
| OPTIONS | `/operation/popover` | untested | untested | - | - | - | no |
| OPTIONS | `/phone/about2Expire` | untested | untested | - | - | - | no |
| POST | `/phone/about2Expire` | untested | untested | - | - | - | no |
| GET | `/phone/costInfo` | untested | untested | - | - | - | no |
| OPTIONS | `/phone/costInfo` | untested | untested | - | - | - | no |
| OPTIONS | `/proxy/groupList` | untested | untested | - | - | - | no |
| POST | `/proxy/groupList` | untested | untested | - | - | - | no |
| OPTIONS | `/team/config` | untested | untested | - | - | - | no |
| POST | `/team/config` | untested | untested | - | - | - | no |
| OPTIONS | `/team/groupOperationAuthList` | untested | untested | - | - | - | no |
| POST | `/team/groupOperationAuthList` | untested | untested | - | - | - | no |
