import React from 'react';

const V = {
  bg:"#F4F1EE", sb:"#FFFFFF", main:"#FAF8F6", card:"#FFFFFF", border:"#E6E0DA",
  border2:"#D4CEC7", t1:"#3D3530", t2:"#5C534D", t3:"#8E857E", t4:"#B5ADA6",
  white:"#FFFFFF", accent:"#5B7DB8", teal:"#3D6098", navy:"#2B4570", blue:"#5B7DB8",
  red:"#C87066", green:"#5A9E6F", orange:"#D4A050", lime:"#A8C868"
};

const CreateMenu = ({ setView }) => {
  const modeCards = [
    {
      id: 'pptx',
      title: 'プレゼン資料',
      subtitle: '(PPTX)',
      icon: '📊',
      badge: '利用可能',
      engine: 'PPTX生成エンジン',
      bgGradient: `linear-gradient(135deg, ${V.red}20 0%, ${V.orange}20 100%)`,
      borderColor: V.red,
      badgeColor: V.red,
      onClick: () => setView('create-pptx'),
      soon: false
    },
    {
      id: 'xlsx',
      title: 'スプレッドシート',
      subtitle: '(XLSX)',
      icon: '📈',
      badge: '利用可能',
      engine: 'Excel生成エンジン',
      bgGradient: `linear-gradient(135deg, ${V.green}20 0%, ${V.lime}20 100%)`,
      borderColor: V.green,
      badgeColor: V.green,
      onClick: () => setView('create-xlsx'),
      soon: false
    },
    {
      id: 'docx',
      title: 'フォーマル文書',
      subtitle: '(DOCX)',
      icon: '📄',
      badge: '利用可能',
      engine: 'Word生成エンジン',
      bgGradient: `linear-gradient(135deg, ${V.blue}20 0%, ${V.accent}20 100%)`,
      borderColor: V.blue,
      badgeColor: V.blue,
      onClick: () => setView('create-docx'),
      soon: false
    },
    {
      id: 'app',
      title: '業務アプリ',
      subtitle: '',
      icon: '📱',
      badge: '準備中',
      engine: 'バイブコーディング (Claude)',
      bgGradient: `linear-gradient(135deg, #9C27B020 0%, #7B1FA220 100%)`,
      borderColor: '#9C27B0',
      badgeColor: '#9C27B0',
      onClick: () => {},
      soon: true
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: V.bg,
      overflow: 'hidden'
    }}>
      {/* Top Bar */}
      <div style={{
        padding: '24px 32px',
        backgroundColor: V.white,
        borderBottom: `1px solid ${V.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: V.t1,
            margin: 0
          }}>
            ✏️ なにをつくりますか？
          </h1>
        </div>
        <p style={{
          fontSize: '14px',
          color: V.t2,
          margin: '8px 0 0 0',
          lineHeight: 1.5
        }}>
          AIがお手伝いして、資料やドキュメントをかんたんにつくれます
        </p>
      </div>

      {/* Center Message */}
      <div style={{
        padding: '20px 32px',
        textAlign: 'center',
        backgroundColor: V.main,
        borderBottom: `1px solid ${V.border}`
      }}>
        <p style={{
          fontSize: '13px',
          color: V.t3,
          margin: 0,
          lineHeight: 1.6
        }}>
          テキストで構成を確認してから本生成。やり直しコストを最小化します。
        </p>
      </div>

      {/* Grid Container */}
      <div style={{
        flex: 1,
        padding: '32px 32px',
        overflow: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '24px',
        alignContent: 'start'
      }}>
        {/* Mode Cards */}
        {modeCards.map((mode) => (
          <div
            key={mode.id}
            onClick={!mode.soon ? mode.onClick : undefined}
            style={{
              background: mode.bgGradient,
              border: `2px solid ${mode.borderColor}`,
              borderRadius: '12px',
              padding: '20px',
              cursor: mode.soon ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: mode.soon ? 0.55 : 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            className={mode.soon ? 'soon-disabled' : ''}
            onMouseEnter={(e) => {
              if (!mode.soon) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
              }
            }}
            onMouseLeave={(e) => {
              if (!mode.soon) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {/* Icon */}
            <div style={{
              fontSize: '32px',
              textAlign: 'center'
            }}>
              {mode.icon}
            </div>

            {/* Title */}
            <div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                color: V.t1,
                margin: '0 0 4px 0'
              }}>
                {mode.title}
              </h3>
              <p style={{
                fontSize: '12px',
                color: V.t3,
                margin: 0
              }}>
                {mode.subtitle}
              </p>
            </div>

            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              backgroundColor: `${mode.badgeColor}15`,
              color: mode.badgeColor,
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
              width: 'fit-content'
            }}>
              {mode.badge}
            </div>

            {/* Engine */}
            <div style={{
              fontSize: '11px',
              color: V.t4,
              marginTop: 'auto',
              borderTop: `1px solid ${V.border}`,
              paddingTop: '8px'
            }}>
              {mode.engine}
            </div>
          </div>
        ))}

        {/* Add Mode Card */}
        <div
          style={{
            border: `2px dashed ${V.border2}`,
            borderRadius: '12px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '160px',
            backgroundColor: V.white,
            color: V.t3
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = V.accent;
            e.currentTarget.style.backgroundColor = `${V.accent}08`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = V.border2;
            e.currentTarget.style.backgroundColor = V.white;
          }}
        >
          <div style={{
            fontSize: '32px',
            color: V.t3
          }}>
            ＋
          </div>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: V.t2,
            margin: 0,
            textAlign: 'center'
          }}>
            モードを追加
          </h3>
          <p style={{
            fontSize: '11px',
            color: V.t4,
            margin: 0,
            textAlign: 'center'
          }}>
            カスタム生成パイプライン
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateMenu;
