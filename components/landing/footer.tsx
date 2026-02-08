import Link from 'next/link'

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '#how-it-works' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: 'mailto:support@draggonnb.co.za' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-3 inline-block">
              <span className="text-xl font-bold gradient-text">DraggonnB</span>{' '}
              <span className="text-sm font-medium text-slate-500">CRMM</span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-500">
              Complete B2B automation for South African SMEs. CRM, AI content, social media, and more.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-3 text-sm font-semibold text-white">{heading}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-slate-600">
            Made for South African SMEs. All prices in ZAR.
          </p>
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} DraggonnB CRMM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
