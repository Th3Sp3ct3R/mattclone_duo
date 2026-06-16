import { Button } from '../../primitives/Button/Button.jsx';
import { AppHeader } from './AppHeader.jsx';

export default {
  title: 'Components/AppHeader',
  component: AppHeader
};

export function Basic() {
  return (
    <AppHeader
      brand={<strong>julio</strong>}
      actions={
        <>
          <Button variant="secondary">Docs</Button>
          <Button>Login</Button>
        </>
      }
    />
  );
}




