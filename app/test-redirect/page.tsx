export const runtime = 'edge';

import { redirect } from 'next/navigation';

export default function TestPage() {
  redirect('https://discord.com');
}
