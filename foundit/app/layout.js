import './globals.css';
import Nav from '@/components/Nav';

export const metadata = { title: 'FoundIt - Campus Lost & Found', description: 'Report, match and claim lost items on campus' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
