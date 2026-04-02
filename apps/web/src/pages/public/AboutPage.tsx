import React from 'react';
import { Link } from 'react-router-dom';
import { Trees, Shield, Zap, Users, Globe, Award, ArrowRight, Leaf } from 'lucide-react';

const AboutPage = () => {
  const team = [
    {
      name: 'Christoffer Svanström',
      role: 'Grundare & VD',
      bio: 'Passionerad om att kombinera AI och skogsbruk för en hållbar framtid. Över 10 års erfarenhet inom tech och skogsförvaltning.',
      image: '/team/christoffer.jpg',
    },
  ];

  const milestones = [
    { year: '2024', title: 'Idén föds', description: 'BeetleSense grundades efter att ha sett hur barkborreangrepp kan devastera svenska skogar.' },
    { year: '2025', title: 'AI-motorn lanseras', description: 'Vår proprietära AI-modell för tidig detektering av barkborreangrepp börjar utvecklas.' },
    { year: '2026', title: 'Marknadsexpansion', description: 'Lansering av Trädröntgen och utveckling av partnerskap med Skogsstyrelsen.' },
  ];

  const values = [
    { icon: Trees, title: 'Skogens bevarare', description: 'Vi skyddar Sveriges skogar genom att ge skogsägare verktyg att agera innan det är för sent.' },
    { icon: Zap, title: 'AI som tjänar naturen', description: 'Vår AI analyserar satellitbilder, drönardta och markdata för att skapa handlingsbara insikter.' },
    { icon: Shield, title: 'Proaktivt skydd', description: 'Tidig varning istället för sen reaktion. Vi upptäcker angrepp veckor innan de syns med blotta ögat.' },
    { icon: Users, title: 'Skogsägarnas partner', description: 'Byggd av och för skogsägare. Varje funktion löser ett verkligt problem i skogsvardagen.' },
    { icon: Globe, title: 'Hållbar framtid', description: 'Friska skogar binder kol. Genom att skydda skogar bidrar vi till klimatmålen.' },
    { icon: Award, title: 'Svensk innovation', description: 'Utvecklad i Sverige med djup förståelse för nordiska skogsförhållanden och regelverk.' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-[#1B5E20]" aria-hidden="true" />
            <span className="text-xl font-bold">BeetleSense</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-400 hover:text-white transition">Hem</Link>
            <Link to="/about" className="text-white font-semibold" aria-current="page">Om oss</Link>
            <Link to="/pricing" className="text-gray-400 hover:text-white transition">Prissättning</Link>
            <Link to="/blog" className="text-gray-400 hover:text-white transition">Blogg</Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition">Kontakt</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-400 hover:text-white transition">Logga in</Link>
            <Link to="/signup" className="px-4 py-2 bg-[#1B5E20] text-white rounded font-semibold hover:bg-[#2d7a2a] transition">
              Kom igång
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#1B5E20]/20 text-[#4CAF50] rounded-full px-4 py-2 mb-6">
          <Trees className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">Grundat i Sverige</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Vi skyddar Sveriges skogar<br />
          <span className="text-[#4CAF50]">med AI-driven intelligens</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-8">
          BeetleSense kombinerar satellitdata, AI och djup skogskunskap för att ge svenska
          skogsägare verktygen de behöver för att skydda, förvalta och maximera värdet av sin skog.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/demo" className="px-8 py-3 bg-[#1B5E20] text-white rounded font-semibold hover:bg-[#2d7a2a] transition flex items-center justify-center gap-2">
            Se en demo <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link to="/contact" className="px-8 py-3 border border-gray-700 text-white rounded font-semibold hover:border-gray-500 transition">
            Kontakta oss
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800 bg-gray-900/50" aria-label="Statistik">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-[#4CAF50]">0</div>
            <div className="text-gray-400 mt-1">Träd analyserade</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#4CAF50]">--</div>
            <div className="text-gray-400 mt-1">AI-träffsäkerhet</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#4CAF50]">0 kr</div>
            <div className="text-gray-400 mt-1">Skogsvärde skyddat</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#4CAF50]">5+</div>
            <div className="text-gray-400 mt-1">Datakällor integrerade</div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Vår mission</h2>
            <p className="text-gray-400 text-lg mb-4">
              Barkborren är det största hotet mot Sveriges 23 miljarder träd. Varje år förstörs skog
              för miljarder kronor — ofta upptäcks angreppen för sent för att rädda bestånden.
            </p>
            <p className="text-gray-400 text-lg mb-4">
              BeetleSense grundades med en enkel vision: ge skogsägare tillgång till samma avancerade
              AI- och satellitteknik som stora skogsbolag, men i ett enkelt, prisvärt verktyg.
            </p>
            <p className="text-gray-400 text-lg">
              Genom att kombinera data från Copernicus-satelliter, Skogsstyrelsen, SLU, SMHI och
              Lantmäteriet skapar vi en komplett bild av varje skogsfastighets hälsa — i realtid.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="space-y-6">
              {milestones.map((m, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-16 text-[#4CAF50] font-bold">{m.year}</div>
                  <div>
                    <div className="font-semibold text-white">{m.title}</div>
                    <div className="text-gray-400 text-sm mt-1">{m.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold text-center mb-4">Våra värderingar</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Allt vi gör drivs av en övertygelse: att teknik ska tjäna naturen, inte tvärtom.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-[#1B5E20] transition">
                <value.icon className="w-8 h-8 text-[#4CAF50] mb-4" aria-hidden="true" />
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Teamet</h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Ett litet men passionerat team som kombinerar djup teknisk expertis med kärlek till den svenska skogen.
        </p>
        <div className="max-w-md mx-auto">
          {team.map((member, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <div className="w-24 h-24 bg-[#1B5E20]/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="w-12 h-12 text-[#4CAF50]" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold">{member.name}</h3>
              <div className="text-[#4CAF50] mb-3">{member.role}</div>
              <p className="text-gray-400">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-6">Redo att skydda din skog?</h2>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
          Börja kostnadsfritt idag. Ingen kreditkort krävs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup" className="px-8 py-3 bg-[#1B5E20] text-white rounded font-semibold hover:bg-[#2d7a2a] transition">
            Börja din kostnadsfria prövning
          </Link>
          <Link to="/demo" className="px-8 py-3 border border-gray-700 text-white rounded font-semibold hover:border-gray-500 transition">
            Se en demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">BeetleSense</h4>
              <p className="text-sm text-gray-400">AI-driven forest intelligence för svenska skogsägare.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-gray-400 hover:text-white transition">Hem</Link></li>
                <li><Link to="/demo" className="text-gray-400 hover:text-white transition">Demo</Link></li>
                <li><Link to="/pricing" className="text-gray-400 hover:text-white transition">Prissättning</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Företag</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-gray-400 hover:text-white transition">Om oss</Link></li>
                <li><Link to="/blog" className="text-gray-400 hover:text-white transition">Blogg</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition">Kontakt</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Juridisk</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition">Integritet</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition">Villkor</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2026 BeetleSense AB. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
