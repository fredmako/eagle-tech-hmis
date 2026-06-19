import React, { useEffect } from 'react';
import { Hero } from './landing/sections/Hero';
import { StatsStrip } from './landing/sections/StatsStrip';
import { ModulesGrid } from './landing/sections/ModulesGrid';
import { About } from './landing/sections/About';
import { Footer } from './landing/sections/Footer';

export default function TenantLandingPage({ facility, onNavigateToLogin }) {
  useEffect(() => {
    if (facility) {
      document.title = facility.name;
      if (facility.favicon_url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = facility.favicon_url;
      }

      if (facility.theme_config) {
        try {
          const config = typeof facility.theme_config === 'string' ? JSON.parse(facility.theme_config) : facility.theme_config;
          const root = document.documentElement;
          if (config.primary) root.style.setProperty('--color-primary', config.primary);
          if (config.primaryForeground) root.style.setProperty('--color-primary-foreground', config.primaryForeground);
          if (config.background) root.style.setProperty('--color-background', config.background);
          if (config.foreground) root.style.setProperty('--color-foreground', config.foreground);
        } catch (e) {
          console.error("Failed to parse theme_config", e);
        }
      }
    }
    return () => {
      // Revert title and favicon if needed
      document.title = "Eagle Tech HMIS";
      const root = document.documentElement;
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-foreground');
      root.style.removeProperty('--color-background');
      root.style.removeProperty('--color-foreground');
    };
  }, [facility]);

  const content = typeof facility.landing_page_content === 'string' 
    ? JSON.parse(facility.landing_page_content || '{}') 
    : (facility.landing_page_content || {});

  const contact = typeof facility.contact_details === 'string'
    ? JSON.parse(facility.contact_details || '{}')
    : (facility.contact_details || {});

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 transition-all duration-medium bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {facility.logo_url && (
              <img src={facility.logo_url} alt={`${facility.name} Logo`} className="w-8 h-8 rounded-lg object-contain" />
            )}
            <span className="font-serif text-lg text-fg-strong">{facility.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onNavigateToLogin} className="text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all duration-medium active:scale-[0.97] cursor-pointer">
              Patient / Staff Portal Login
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 relative z-10">
        <div className="relative py-20 px-6 sm:px-12 lg:px-24 overflow-hidden flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl md:text-7xl font-serif tracking-tight text-fg-strong mb-6 relative z-10">
            {content.heroTitle || `Welcome to ${facility.name}`}
          </h1>
          <p className="text-xl text-fg-muted max-w-2xl mx-auto mb-10 relative z-10">
            {content.heroSubtitle || "Comprehensive healthcare services tailored to your needs."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            <button onClick={onNavigateToLogin} className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all duration-medium active:scale-95 cursor-pointer shadow-lg shadow-primary/25">
              Access Portal
            </button>
          </div>
        </div>

        {content.aboutUs && (
          <div className="py-16 px-6 max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-serif text-fg-strong mb-6">About Us</h2>
            <p className="text-lg text-fg-muted">{content.aboutUs}</p>
          </div>
        )}
        
        {content.features && content.features.length > 0 && (
          <div className="py-16 px-6 max-w-7xl mx-auto">
            <h2 className="text-3xl font-serif text-fg-strong mb-8 text-center">Our Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.features.map((feature, idx) => (
                <div key={idx} className="p-6 bg-surface border border-border rounded-xl">
                  <h3 className="text-xl font-bold text-fg-strong mb-2">{feature.title}</h3>
                  <p className="text-fg-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      <footer className="bg-surface border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <h3 className="font-serif text-xl text-fg-strong mb-4">{facility.name}</h3>
            {contact.address && <p className="text-fg-muted mb-2">{contact.address}</p>}
            {contact.phone && <p className="text-fg-muted mb-2">{contact.phone}</p>}
            {contact.email && <p className="text-fg-muted">{contact.email}</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}