import { Link } from "react-router-dom";
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaArrowRight,
} from "react-icons/fa";

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      {/* Main Footer */}
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Column 1 — About */}
        <div>
          <h3 className="mb-4 text-lg font-extrabold text-white">About CMReunite</h3>
          <p className="text-sm leading-7 text-slate-400">
            A dedicated platform for CMR Institute of Technology alumni to reconnect,
            collaborate, and grow together. Stay close to the community that shaped you.
          </p>
          <div className="mt-5 flex gap-3">
            <a href="#" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-blue-600 hover:text-white">
              <FaFacebook />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-sky-500 hover:text-white">
              <FaTwitter />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-pink-600 hover:text-white">
              <FaInstagram />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-blue-700 hover:text-white">
              <FaLinkedin />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-red-600 hover:text-white">
              <FaYoutube />
            </a>
          </div>
        </div>

        {/* Column 2 — Quick Links */}
        <div>
          <h3 className="mb-4 text-lg font-extrabold text-white">Quick Links</h3>
          <ul className="space-y-2 text-sm font-semibold">
            {[
              ["/events", "Events"],
              ["/jobs", "Job Board"],
              ["/mentorship", "Mentorship"],
              ["/alumni-directory", "Alumni Directory"],
              ["/connections", "Connections"],
              ["/career-referrals", "Career Referrals"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="flex items-center gap-2 transition hover:text-white">
                  <FaArrowRight className="text-[0.6rem] text-teal-500" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Resources */}
        <div>
          <h3 className="mb-4 text-lg font-extrabold text-white">Resources</h3>
          <ul className="space-y-2 text-sm font-semibold">
            {[
              ["/alumni-stories", "Alumni Stories"],
              ["/recognition", "Recognition"],
              ["/announcements", "Announcements"],
              ["/contributions", "Contributions"],
              ["/forum", "Community Forum"],
              ["/resources", "Learning Resources"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="flex items-center gap-2 transition hover:text-white">
                  <FaArrowRight className="text-[0.6rem] text-teal-500" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4 — Contact Us */}
        <div>
          <h3 className="mb-4 text-lg font-extrabold text-white">Contact Us</h3>
          <ul className="space-y-4 text-sm font-semibold">
            <li className="flex items-start gap-3">
              <FaMapMarkerAlt className="mt-0.5 text-base text-teal-500" />
              <span className="text-slate-400">
                CMR Institute of Technology,<br />
                Whitefield, Bangalore,<br />
                Karnataka 560048
              </span>
            </li>
            <li className="flex items-center gap-3">
              <FaPhone className="text-base text-teal-500" />
              <span className="text-slate-400">+91 80 2852 1030</span>
            </li>
            <li className="flex items-center gap-3">
              <FaEnvelope className="text-base text-teal-500" />
              <span className="text-slate-400">alumni@cmrit.ac.in</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs font-semibold text-slate-500 sm:flex-row">
          <p>&copy; 2026 CMReunite. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="transition hover:text-white">Privacy Policy</a>
            <a href="#" className="transition hover:text-white">Terms of Service</a>
            <a href="#" className="transition hover:text-white">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
