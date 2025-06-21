import React from 'react';
import Logo from './Logo';

const LogoShowcase: React.FC = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb' }}>
      <h2 style={{ marginBottom: '2rem', color: '#111827' }}>Family Board Logo Showcase</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Different sizes */}
        <div>
          <h3 style={{ marginBottom: '1rem', color: '#6b7280' }}>Different Sizes</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Logo size={24} />
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>24px</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Logo size={32} />
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>32px</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Logo size={48} />
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>48px (Header)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Logo size={64} />
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>64px</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Logo size={96} />
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>96px</span>
            </div>
          </div>
        </div>

        {/* In context examples */}
        <div>
          <h3 style={{ marginBottom: '1rem', color: '#6b7280' }}>In Context</h3>
          
          {/* Header example */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1rem 2rem', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Logo size={48} />
              <h1 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#7c3aed', 
                margin: 0 
              }}>
                Bianchi Touil Board
              </h1>
            </div>
          </div>

          {/* Card example */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <Logo size={32} />
              <div>
                <h3 style={{ margin: 0, color: '#111827' }}>Family Board</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                  Organize your family's tasks and activities
                </p>
              </div>
            </div>
          </div>

          {/* Button example */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              <Logo size={20} />
              Open Family Board
            </button>
            
            <button style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              backgroundColor: 'white',
              color: '#7c3aed',
              border: '2px solid #7c3aed',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              <Logo size={20} />
              Create Board
            </button>
          </div>
        </div>

        {/* Background variations */}
        <div>
          <h3 style={{ marginBottom: '1rem', color: '#6b7280' }}>Background Variations</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '1rem', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Logo size={32} />
              <span style={{ color: '#111827' }}>White Background</span>
            </div>
            
            <div style={{ 
              backgroundColor: '#f3f4f6', 
              padding: '1rem', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Logo size={32} />
              <span style={{ color: '#111827' }}>Gray Background</span>
            </div>
            
            <div style={{ 
              backgroundColor: '#1f2937', 
              padding: '1rem', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Logo size={32} />
              <span style={{ color: 'white' }}>Dark Background</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoShowcase; 