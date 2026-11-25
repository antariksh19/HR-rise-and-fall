import { redirect } from 'next/navigation';

export default function DeprecatedTeamLoginRedirect() {
  redirect('/vote');
}