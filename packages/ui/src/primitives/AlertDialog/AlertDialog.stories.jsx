import { AlertDialog } from './AlertDialog.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/AlertDialog' };

export const Slots = {
  render: () => <SlotsList title="AlertDialog slots" value={AlertDialog} />
};

export const Preview = {
  render: () => (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Trigger>
        <Button>Open</Button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup>
          <AlertDialog.Title>Confirm</AlertDialog.Title>
          <AlertDialog.Description>Are you sure?</AlertDialog.Description>
          <AlertDialog.Close>
            <Button variant="secondary">Close</Button>
          </AlertDialog.Close>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
};
