import React from 'react'
import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer>
      {/* Newsletter Section */}
      <div className="bg-zinc-900 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white text-lg font-bold mb-1">Sign Up To Our Newsletter.</h3>
              <p className="text-zinc-400 text-xs">Be the first to hear about the latest offers.</p>
            </div>
            <form className="flex gap-2 w-full max-w-md">
              <input
                type="email"
                placeholder="Your Email"
                className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2.5 text-sm text-white w-full focus:ring-1 focus:ring-blue-600 outline-none placeholder:text-zinc-500"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded text-sm font-bold transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="bg-zinc-950 py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-10">
            <div>
              <h4 className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider mb-3">Information</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About Zip</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Search</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Orders and Returns</a></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Advanced Search</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Newsletter Subscription</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider mb-3">PC Parts</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">CPUs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Add On Cards</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Hard Drives (HDD)</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Graphic Cards</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Keyboards / Mice</a></li>
                <li><a href="#" className="hover:text-white transition-colors">RAM (Memory)</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Software</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Speakers / Headsets</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Motherboards</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider mb-3">Desktop PCs</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">Custom PCs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Servers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">MSI All-In-One PCs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">HP/Compaq PCs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ASUS PCs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tecs PCs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider mb-3">Laptops</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">Everyday Use Laptops</a></li>
                <li><a href="#" className="hover:text-white transition-colors">MSI Laptops</a></li>
                <li><a href="#" className="hover:text-white transition-colors">HP Laptops</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ASUS Laptops</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Workstation Laptops</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider mb-3">Address</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li>Address: 1234 Street Adress City Address, 1234</li>
                <li className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Phone: (00) 1234 5678
                </li>
                <li>Email: shop@email.com</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-zinc-500">
            <p>© 2026 DATNECOMM. All Rights Reserved.</p>
            <div className="flex gap-3 items-center text-zinc-600">
              {/* Payment method icons */}
              <span className="border border-zinc-700 rounded px-2 py-1 text-[9px] font-bold">VISA</span>
              <span className="border border-zinc-700 rounded px-2 py-1 text-[9px] font-bold">MC</span>
              <span className="border border-zinc-700 rounded px-2 py-1 text-[9px] font-bold">PayPal</span>
              <span className="border border-zinc-700 rounded px-2 py-1 text-[9px] font-bold">Zip</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
