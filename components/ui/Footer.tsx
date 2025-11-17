export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-16">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold mb-3">Agneepath 7.0</h3>
            <p className="text-gray-400 text-sm">
              An athletic event bringing together the best sports talents from across institutions.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/dashboard" className="hover:text-white transition">Dashboard</a></li>
              <li><a href="/dashboard/regForm" className="hover:text-white transition">Register</a></li>
              <li><a href="/dashboard/Payments" className="hover:text-white transition">Payments</a></li>
            </ul>
          </div>
          
          {/* Contact Section */}
          <div>
            <h3 className="text-lg font-bold mb-3">Contact</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Email: <a href="mailto:agneepath@ashoka.edu.in" className="hover:text-white transition">agneepath@ashoka.edu.in</a></li>
              <li>Phone: +91-XXX-XXX-XXXX</li>
            </ul>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-700 pt-6">
          <p className="text-center text-gray-400 text-sm">
            &copy; 2025 Agneepath. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}