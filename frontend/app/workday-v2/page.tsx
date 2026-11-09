import { redirect } from 'next/navigation';

// The v2 layout became the main /workday page; keep old links working.
export default function WorkdayV2Redirect() {
  redirect('/workday');
}
