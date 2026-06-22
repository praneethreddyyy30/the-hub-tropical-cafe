import React, { useState } from 'react';
import { 
  Award, ShieldCheck, Heart, Sparkles, Coffee, MapPin, 
  ChevronLeft, ChevronRight, BookOpen, Compass, Waves 
} from 'lucide-react';

export default function CafeJourneyPage() {
  const [activeOrigin, setActiveOrigin] = useState('araku');
  const [activeMilestone, setActiveMilestone] = useState(0);

  const origins = {
    araku: {
      name: 'Araku Valley Organic',
      cooperative: 'Araku Tribal Farmers',
      altitude: '1,100m - 1,250m',
      process: 'Washed / Sun-Dried',
      roastLevel: 'Medium',
      tastingNotes: ['Brown Sugar', 'Spiced Plum', 'Cacao Nibs', 'Citrus Orange'],
      description: 'Sourced from the Eastern Ghats of Andhra Pradesh, these beans are grown organically under dense forest canopies, yielding a full-bodied cup with mild acidity and a dark cacao undertone.',
      image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&auto=format&fit=crop&q=80'
    },
    munnar: {
      name: 'Munnar Cardamom Spice',
      cooperative: 'Wayanad Hill Farms',
      altitude: '1,500m - 1,600m',
      process: 'Shade Dried Herbals',
      roastLevel: 'Botanical Blend',
      tastingNotes: ['Green Cardamom', 'Fresh Ginger', 'Lemongrass', 'Wild Honey'],
      description: 'Grown amidst the mist-shrouded peaks of Kerala, our botanical tea blends are enriched with hand-ground pods of cardamom and ginger root for an aromatic, refreshing infusion.',
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'
    },
    nilgiri: {
      name: 'Nilgiri Blue Mountain',
      cooperative: 'Craigmore Tea Estate',
      altitude: '1,700m - 1,800m',
      process: 'Orthodox Fermentation',
      roastLevel: 'Medium-Light',
      tastingNotes: ['Floral Jasmine', 'Nectarine', 'Sweet Eucalyptus', 'Black Currant'],
      description: 'Known as the Blue Mountains of South India, these high-elevation slopes yield bright, copper-hued orthodox black teas that possess a distinct floral perfume and clean fruit finish.',
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'
    }
  };

  const milestones = [
    { 
      year: '2022', 
      title: 'Tropical Escape Begins', 
      desc: 'Opened our cozy botanical garden cafe on Kalyandurgam Road in Anantapur, introducing fresh continental fries, thick shakes, and cold coolers to the city.',
      quote: 'We wanted to create a green sanctuary where college students and local families could escape the heat and enjoy continental favorites.',
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80'
    },
    { 
      year: '2023', 
      title: 'Menu & Kitchen Expansion', 
      desc: 'Expanded our kitchen menu to feature authentic Belgian waffles, double-decker club sandwiches, and organic passion fruit mojitos.',
      quote: 'Our guests asked for hearty continental bites to pair with their coolers, prompting us to build a full continental fusion menu.',
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'
    },
    { 
      year: '2024', 
      title: 'Botanical Ambience Upgrade', 
      desc: 'Renovated our dining space with hanging ivy pots, natural bamboo dividers, and warm sunset gold mood lighting.',
      quote: 'We redesigned the space so that every table feels nestled inside a private garden, providing a cozy atmosphere for conversations.',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80'
    },
    { 
      year: '2026', 
      title: 'Smart Dining Experience', 
      desc: 'Introduced WebSocket-based table QR ordering, live wait-time tracking, and interactive retro waitroom games.',
      quote: 'We wanted technology to elevate—not replace—hospitality. Contactless ordering frees up guests to enjoy the green ambiance.',
      image: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&auto=format&fit=crop&q=80'
    }
  ];

  const team = [
    { name: 'Marcus Vance', role: 'Founder & Head Chef', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', bio: 'Marcus founded The Hub to bring high-quality Continental cuisine and mocktails to his hometown in Anantapur.' },
    { name: 'Elena Rostova', role: 'Head Pastry & Waffle Chef', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', bio: 'Elena specializes in hot Belgian waffles and infuses local mangoes and fruits into premium custom custards.' },
    { name: 'Darnell Harris', role: 'Lead Barista & Mixologist', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', bio: 'Darnell masterminds our signature coolers, double-blended hazelnut frappés, and mint cold brews.' }
  ];

  const nextMilestone = () => {
    setActiveMilestone((prev) => (prev === milestones.length - 1 ? 0 : prev + 1));
  };

  const prevMilestone = () => {
    setActiveMilestone((prev) => (prev === 0 ? milestones.length - 1 : prev - 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 space-y-20">
      
      {/* 1. PREMIUM HEADER */}
      <div className="relative text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cafe-gold/10 border border-cafe-gold/25 text-cafe-darkgold dark:text-cafe-gold text-xs font-bold uppercase tracking-widest animate-pulse-subtle">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Our Story & Botanical Roots</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cafe-chocolate dark:text-white font-bold leading-tight">
          Anantapur\'s Garden <span className="text-cafe-gold italic">Culinary Escape</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-light text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          At The Hub Tropical Cafe, our kitchen bridges fresh South Indian spice extraction, continental baking, and dynamic table service into a relaxing garden sanctuary.
        </p>
        
        {/* Decorative Gold Line */}
        <div className="flex justify-center items-center gap-2 pt-2">
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-cafe-gold" />
          <Compass className="w-5 h-5 text-cafe-gold animate-spin-slow" />
          <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-cafe-gold" />
        </div>
      </div>

      {/* 2. DYNAMIC & INTERACTIVE BEAN ORIGINS SECTION */}
      <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 rounded-3xl p-6 md:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cafe-gold/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Origin selector tabs */}
          <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-cafe-gold uppercase tracking-widest block mb-1">Specialty Growers</span>
              <h3 className="font-serif text-2xl md:text-3xl font-bold text-cafe-chocolate dark:text-white">Botanical Sourcing</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-light mt-1.5">
                We source organic tea leaves, single-estate beans, and spices directly from South Indian botanical farming communities.
              </p>
            </div>

            <div className="space-y-3.5 my-6 lg:my-0">
              {Object.keys(origins).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveOrigin(key)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-300 ${
                    activeOrigin === key
                      ? 'bg-cafe-wood text-white border-cafe-wood dark:bg-cafe-gold dark:text-cafe-chocolate dark:border-cafe-gold shadow-md'
                      : 'bg-gray-50 text-gray-700 border-gray-150 hover:border-cafe-gold/40 dark:bg-cafe-charcoal/40 dark:text-gray-300 dark:border-cafe-wood/25'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-4 h-4 ${activeOrigin === key ? 'text-cafe-gold dark:text-cafe-chocolate animate-bounce-subtle' : 'text-gray-400'}`} />
                    <div>
                      <span className="text-xs font-bold block">{origins[key].name}</span>
                      <span className={`text-[10px] block font-light ${activeOrigin === key ? 'text-gray-200 dark:text-cafe-chocolate/85' : 'text-gray-400'}`}>
                        {origins[key].cooperative}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs text-cafe-darkgold dark:text-cafe-gold font-serif italic">
              <Compass className="w-4 h-4 animate-spin-slow" />
              <span>Explore flavors from equator to cup.</span>
            </div>
          </div>

          {/* Right panel: Detailed Showcase Card */}
          <div className="lg:col-span-8 bg-gray-50/50 dark:bg-cafe-charcoal/50 border border-cafe-gold/10 rounded-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500">
            {/* Visual Image */}
            <div className="md:w-5/12 h-64 md:h-auto relative overflow-hidden bg-cafe-chocolate/10">
              <img 
                src={origins[activeOrigin].image} 
                alt={origins[activeOrigin].name} 
                className="w-full h-full object-cover scale-100 hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-[10px] font-bold tracking-wider uppercase">
                {origins[activeOrigin].roastLevel} Roast
              </div>
            </div>

            {/* Metrics & Details */}
            <div className="md:w-7/12 p-6 flex flex-col justify-between space-y-6">
              <div>
                <h4 className="font-serif text-xl font-bold text-cafe-chocolate dark:text-white mb-2">
                  {origins[activeOrigin].name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-light leading-relaxed">
                  {origins[activeOrigin].description}
                </p>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-cafe-gold/10 py-4 text-xs font-light text-gray-500 dark:text-gray-400">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Altitude Elevation</span>
                  <span className="font-bold text-gray-800 dark:text-white block mt-0.5">{origins[activeOrigin].altitude}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Processing Method</span>
                  <span className="font-bold text-gray-800 dark:text-white block mt-0.5">{origins[activeOrigin].process}</span>
                </div>
              </div>

              {/* Tasting Notes */}
              <div>
                <span className="text-[10px] text-gray-400 uppercase block mb-2 font-semibold">Tasting Profile Notes</span>
                <div className="flex flex-wrap gap-2">
                  {origins[activeOrigin].tastingNotes.map((note) => (
                    <span 
                      key={note}
                      className="px-2.5 py-1 bg-cafe-gold/10 border border-cafe-gold/20 text-cafe-darkgold dark:text-cafe-gold rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-cafe-gold hover:text-cafe-chocolate transition-colors duration-300"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{note}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC TIMELINE DECK SHOWCASE */}
      <div className="space-y-8">
        <div className="text-center max-w-md mx-auto space-y-1">
          <span className="text-xs font-semibold text-cafe-gold uppercase tracking-widest block font-serif">Chronicles</span>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-cafe-chocolate dark:text-white">Our Timeline Journey</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Browse the milestones that defined our growth and specialty craft.</p>
        </div>

        {/* Milestone Card Slider */}
        <div className="relative max-w-4xl mx-auto flex items-center">
          {/* Arrow Left */}
          <button 
            onClick={prevMilestone}
            className="absolute -left-4 md:-left-12 z-20 p-3 bg-white dark:bg-cafe-chocolate border border-cafe-gold/20 rounded-full shadow-md text-gray-600 dark:text-gray-200 hover:text-cafe-gold transition duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Active Card Body */}
          <div className="w-full bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 shadow-sm transition-all duration-500 relative min-h-[300px] items-stretch">
            {/* Year Badge */}
            <div className="absolute top-4 right-6 bg-cafe-gold/15 border border-cafe-gold/25 px-4 py-1.5 rounded-full text-cafe-darkgold dark:text-cafe-gold font-serif font-bold text-sm">
              {milestones[activeMilestone].year}
            </div>

            {/* Slide Image */}
            <div className="md:w-5/12 h-48 md:h-auto rounded-2xl overflow-hidden bg-cafe-chocolate/5">
              <img 
                src={milestones[activeMilestone].image} 
                alt={milestones[activeMilestone].title}
                className="w-full h-full object-cover scale-100 hover:scale-102 transition duration-500" 
              />
            </div>

            {/* Slide Details */}
            <div className="md:w-7/12 flex flex-col justify-between py-2 space-y-4">
              <div>
                <span className="text-[10px] text-cafe-gold font-bold uppercase tracking-widest block mb-1">Milestone Achievement</span>
                <h4 className="font-serif text-2xl font-bold text-cafe-chocolate dark:text-white mb-2">
                  {milestones[activeMilestone].title}
                </h4>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-light leading-relaxed">
                  {milestones[activeMilestone].desc}
                </p>
              </div>

              {/* Testimonial Quote */}
              <div className="border-l-2 border-cafe-gold pl-4 italic text-xs text-gray-500 dark:text-gray-300 bg-gray-50/50 dark:bg-cafe-charcoal/20 p-3.5 rounded-r-xl">
                “{milestones[activeMilestone].quote}”
              </div>
            </div>
          </div>

          {/* Arrow Right */}
          <button 
            onClick={nextMilestone}
            className="absolute -right-4 md:-right-12 z-20 p-3 bg-white dark:bg-cafe-chocolate border border-cafe-gold/20 rounded-full shadow-md text-gray-600 dark:text-gray-200 hover:text-cafe-gold transition duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bubble Indicators */}
        <div className="flex justify-center gap-2.5">
          {milestones.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveMilestone(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                activeMilestone === idx 
                  ? 'bg-cafe-gold w-6 shadow-sm shadow-cafe-gold/30' 
                  : 'bg-gray-300 dark:bg-cafe-wood/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 4. PREMIUM CORE VALUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Heart, title: 'Ethical Sourcing', desc: 'We pay 25% above Fair Trade minimums directly to farmers, supporting clean water infrastructure in growing regions.' },
          { icon: ShieldCheck, title: 'Artisanal Purity', desc: 'No additives. We roast light-to-medium to highlight terroir. Pastries are hand-laminated with grass-fed butter.' },
          { icon: Award, title: 'Smart Hospitality', desc: 'Merges dynamic QR ticketing, real-time WebSocket wait progress, and waiting games to maximize guest convenience.' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-cafe-chocolate/5 border border-cafe-gold/15 p-6 rounded-2xl shadow-xs text-center md:text-left transition-all duration-300 hover:border-cafe-gold/30 hover:scale-102">
            <div className="w-11 h-11 bg-cafe-gold/10 text-cafe-gold rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0 border border-cafe-gold/15">
              <item.icon className="w-5 h-5 text-cafe-gold" />
            </div>
            <h4 className="font-serif text-lg font-bold text-cafe-chocolate dark:text-white mb-2">{item.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-light leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* 5. MEET THE TEAM & CRAFT MASTERS */}
      <div className="space-y-8">
        <div className="text-center">
          <span className="text-xs font-semibold text-cafe-gold uppercase tracking-widest block mb-1">Meet the Masters</span>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-cafe-chocolate dark:text-white">Our Coffee & Baking Artisans</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {team.map((member, idx) => (
            <div key={idx} className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 rounded-3xl overflow-hidden shadow-xs hover:border-cafe-gold/35 hover:-translate-y-1 transition duration-300 flex flex-col justify-between">
              <div className="h-64 overflow-hidden relative">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6 space-y-2">
                <h4 className="font-bold text-base text-gray-800 dark:text-white leading-tight">{member.name}</h4>
                <p className="text-xs font-semibold text-cafe-darkgold dark:text-cafe-gold">{member.role}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-light leading-relaxed">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. PHOTO GALLERY GRID */}
      <div className="space-y-8">
        <div className="text-center">
          <span className="text-xs font-semibold text-cafe-gold uppercase tracking-widest block mb-1">Visual Space</span>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-cafe-chocolate dark:text-white">Roastery & Dining Gallery</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=500', cap: 'Specialty Sourcing' },
            { url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500', cap: 'Drum Bean Roasting' },
            { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500', cap: 'Our Velvet Latte Art' },
            { url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500', cap: 'Fresh Baked Sourdough' }
          ].map((item, idx) => (
            <div key={idx} className="group relative h-48 md:h-64 rounded-2xl overflow-hidden bg-cafe-chocolate/10 border border-cafe-gold/15 shadow-sm">
              <img src={item.url} alt={item.cap} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 text-center">
                <span className="text-xs font-bold text-white tracking-widest uppercase border border-cafe-gold/30 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md">
                  {item.cap}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
