'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Dialog, Input, Switch } from '@julio/ui';

const initialPost = {
  sourceUrl: '',
  caption: '',
  soundQuery: ''
};

function hasAssignedDevice(account) {
  return Boolean(account?.assignedDeviceId);
}

export function OnboardDialog({ account, open, onOpenChange, onOnboard, loading = false }) {
  const [warmup, setWarmup] = useState(true);
  const [post, setPost] = useState(initialPost);
  const canOnboard = account?.platform === 'tiktok' && hasAssignedDevice(account);

  useEffect(() => {
    if (!open) return;
    setWarmup(true);
    setPost(initialPost);
  }, [open]);

  async function submit(event) {
    event.preventDefault();
    if (!account?._id || !canOnboard) return;
    const trimmedSourceUrl = post.sourceUrl.trim();
    await onOnboard(account, {
      warmup,
      post: trimmedSourceUrl
        ? {
            sourceUrl: trimmedSourceUrl,
            caption: post.caption.trim(),
            soundQuery: post.soundQuery.trim()
          }
        : null
    });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Card>
            <form className="layout-stack-gap-12" onSubmit={submit}>
              <Dialog.Title>Onboard TikTok Account</Dialog.Title>
              <Dialog.Description>
                Queue the scalable login to profile setup workflow, with optional warmup and first post.
              </Dialog.Description>
              <span className="Kicker">{account?.credentials?.username || 'Account'}</span>
              {!canOnboard ? (
                <div className="Error">TikTok onboarding requires an assigned device.</div>
              ) : null}
              <label className="layout-inline-gap-8">
                <Switch.Root checked={warmup} onCheckedChange={setWarmup}>
                  <Switch.Thumb />
                </Switch.Root>
                <span>Run warmup after profile setup</span>
              </label>
              <div className="layout-stack-gap-8">
                <span className="Kicker">Optional first post</span>
                <Input
                  placeholder="Public media URL"
                  value={post.sourceUrl}
                  onChange={(event) => setPost((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                />
                <Input
                  placeholder="Caption"
                  value={post.caption}
                  onChange={(event) => setPost((prev) => ({ ...prev, caption: event.target.value }))}
                />
                <Input
                  placeholder="Sound search"
                  value={post.soundQuery}
                  onChange={(event) => setPost((prev) => ({ ...prev, soundQuery: event.target.value }))}
                />
              </div>
              <div className="layout-inline-gap-8">
                <Button type="submit" loading={loading} disabled={!canOnboard}>
                  Queue onboarding
                </Button>
                <Dialog.Close>
                  <Button type="button" variant="secondary">
                    cancel
                  </Button>
                </Dialog.Close>
              </div>
            </form>
          </Card>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
