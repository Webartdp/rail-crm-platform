import { redirect } from 'next/navigation';

// Former developer status page; send users to their start page instead.
export default function StatusRedirect() {
  redirect('/');
}
