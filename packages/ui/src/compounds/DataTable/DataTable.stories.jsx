import { DataTable } from './DataTable.jsx';

export default { title: 'Compounds/DataTable' };

const columns = [
  {
    header: 'Name',
    accessorKey: 'name'
  },
  {
    header: 'Role',
    accessorKey: 'role'
  },
  {
    header: 'Status',
    accessorKey: 'status'
  }
];

const data = [
  { name: 'Jane Doe', role: 'Admin', status: 'Active' },
  { name: 'Sam Lee', role: 'Editor', status: 'Active' },
  { name: 'Chris Fox', role: 'Viewer', status: 'Invited' }
];

export const Preview = {
  render: () => <DataTable columns={columns} data={data} />
};

