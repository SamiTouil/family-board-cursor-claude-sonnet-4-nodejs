import { useTranslation } from 'react-i18next'
import './App.css'

function App(): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">{t('app.title')}</h1>
      </header>
      <main className="app-main">
        {/* Content will be added here */}
      </main>
    </div>
  )
}

export default App 