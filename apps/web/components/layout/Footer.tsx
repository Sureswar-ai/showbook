export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="font-semibold text-gray-900 mb-3">ShowBook</div>
            <p className="text-xs text-gray-500">
              A demo-only BookMyShow replica. Not affiliated with BookMyShow.
            </p>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3">Browse</div>
            <ul className="space-y-1">
              <li>Movies</li>
              <li>Events</li>
              <li>Plays</li>
              <li>Sports</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3">Help</div>
            <ul className="space-y-1">
              <li>FAQ</li>
              <li>Terms</li>
              <li>Privacy</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3">Demo</div>
            <ul className="space-y-1 text-xs">
              <li>Admin: +911111111111</li>
              <li>Customer: +912222222222</li>
              <li>OTP: 123456</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400">
          © {new Date().getFullYear()} ShowBook · For presentation purposes only
        </div>
      </div>
    </footer>
  );
}
