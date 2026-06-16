import { Dialog } from './Dialog.jsx';
import { Button } from '../Button/Button.jsx';

export default {
  title: 'Primitives/Dialog'
};

export const Basic = {
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>Open dialog</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup style={{ padding: 16, background: 'white', borderRadius: 12 }}>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description style={{ marginTop: 8 }}>
            This is a Base UI Dialog primitive wrapper.
          </Dialog.Description>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Dialog.Close>
              <Button variant="secondary">Close</Button>
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
};


