'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, Clock3,
  ChevronDown, Download, Eye, EyeOff, FileCheck2, FileText, Info, Lock,
  LoaderCircle, Mail, Receipt, RefreshCw, ShieldCheck, User, X,
} from 'lucide-react'
import {
  consultarEntidadFiscal,
  generarFactura,
  obtenerRegimenesFiscales,
  obtenerUsosCfdi,
  validarTicketFacturacion,
} from './services/autofacturacionApi'

const emptyPurchase = { ticket: '', code: '', date: '', total: 0 }

const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(Number(value || 0))

const formatDate = (value) => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value))

const createEmptyFiscal = () => ({
  entityFiscalId: null,
  rfc: '',
  name: '',
  zip: '',
  regime: '',
  regimeId: null,
  cfdi: '',
  cfdiId: null,
  email: '',
  confirmEmail: '',
})

const steps = [
  ['Compra', 'Ingresa los datos de tu ticket'],
  ['Datos fiscales', 'Completa tu información'],
  ['Confirmar', 'Revisa y genera tu CFDI'],
  ['¡Listo!', 'Factura generada'],
]

function Header() {
  return (
    <header className="site-header">
      <div className="site-shell">
        <img src="/assets/logo-sayer.png" alt="Sayer" className="header-logo" />
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div className="footer-brand">
          <img src="/assets/bajio.png" alt="Pinturas y Barnices del Bajío" />
          <div>
            <p>Pinturas y Barnices del Bajío es distribuidor autorizado de Sayer Lack Mexicana, S.A. de C.V.</p>
            <small>Los logotipos, nombres comerciales y elementos visuales mostrados son propiedad de sus respectivas marcas.</small>
          </div>
        </div>
        <div className="footer-social">
          <strong>Síguenos</strong>
          <div className="social-row" aria-label="Redes sociales">
            <span>f</span><span>◎</span><span>in</span><span>▶</span>
          </div>
        </div>
        <div className="footer-links">
          <div><a href="#terminos">Términos y condiciones</a><a href="#privacidad">Aviso de privacidad</a></div>
          <div className="payment-row" aria-label="Métodos de pago"><b>VISA</b><b>●●</b><b>AMEX</b><b>Pay</b></div>
        </div>
      </div>
    </footer>
  )
}

function Stepper({ current }) {
  const shown = current === 4 ? steps : steps.slice(0, 3)
  return (
    <nav className="stepper" aria-label="Progreso de autofacturación">
      {shown.map(([title, description], index) => {
        const number = index + 1
        const active = number === current
        const complete = number < current
        return (
          <div className={`step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`} key={title}>
            <span className="step-number">{complete ? <Check size={20} /> : number}</span>
            <span className="step-copy"><strong>{title}</strong><small>{description}</small></span>
            {index < shown.length - 1 && <i />}
          </div>
        )
      })}
    </nav>
  )
}

function Field({ label, icon: Icon, className = '', error = '', ...props }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <div className={error ? 'invalid' : ''}>{Icon && <Icon size={21} aria-hidden="true" />}<input {...props} aria-invalid={Boolean(error)} /></div>
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  )
}

function SearchableSelect({ label, value, onChange, options, placeholder, loading = false, required = false }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const listboxId = useId()
  const normalizeText = (text) => text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
  const normalizedQuery = normalizeText(query.trim())
  const selectedOption = options.find((option) => option.value === value)
  const filteredOptions = options.filter((option) => (
    !normalizedQuery || normalizeText(option.label).includes(normalizedQuery)
  ))

  useEffect(() => {
    if (!open) return undefined
    setQuery('')
    window.requestAnimationFrame(() => searchRef.current?.focus())

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  const selectOption = (option) => {
    onChange(option.value)
    setOpen(false)
  }

  return (
    <div className="field searchable-select" ref={rootRef}>
      <span>{label}</span>
      <button
        type="button"
        className="searchable-trigger"
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required}
        aria-invalid={required && !value}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selectedOption ? 'selected-value' : 'placeholder'}>
          {selectedOption ? selectedOption.label : (loading ? 'Cargando opciones…' : placeholder)}
        </span>
        {loading ? <LoaderCircle className="select-spinner" aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      </button>
      {open && !loading && (
        <div className="searchable-popover">
          <div className="searchable-search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Buscar por clave o descripción…"
              role="combobox"
              aria-controls={listboxId}
              aria-expanded="true"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false)
                if (event.key === 'Enter' && filteredOptions.length === 1) {
                  event.preventDefault()
                  selectOption(filteredOptions[0])
                }
              }}
            />
          </div>
          <div className="searchable-options" id={listboxId} role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => {
              const [code, ...description] = option.label.split(' - ')
              const selected = value === option.value
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? 'selected' : ''}
                  key={option.id}
                  onClick={() => selectOption(option)}
                >
                  <strong>{code}</strong>
                  <span>{description.join(' - ')}</span>
                  {selected && <Check aria-hidden="true" />}
                </button>
              )
            }) : <p>No se encontraron coincidencias.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function Hero({ step }) {
  const copy = {
    1: ['Autofacturación', 'Genera tu factura de manera rápida y sencilla.'],
    2: ['Genera tu factura', 'Es rápido, fácil y seguro.'],
    3: ['Confirma y genera tu CFDI', 'Revisa la información y completa tu factura.'],
    4: ['¡Tu factura ha sido generada!', 'Hemos enviado una copia a tu correo electrónico.'],
  }[step]
  return <div className="hero-copy"><span>AUTOFACTURACIÓN</span><h1>{copy[0]}</h1><p>{copy[1]}</p></div>
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(onClose, 4500)
    return () => window.clearTimeout(timeout)
  }, [toast, onClose])

  if (!toast) return null

  return (
    <div className={`toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span className="toast-icon">{toast.type === 'error' ? <Info /> : <Check />}</span>
      <p>{toast.message}</p>
      <button type="button" onClick={onClose} aria-label="Cerrar notificación"><X /></button>
    </div>
  )
}

function PurchaseStep({ onValidated, notify }) {
  const [ticket, setTicket] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    if (!ticket.trim() || !code.trim()) {
      const message = 'Ingresa el folio y el código de facturación para continuar.'
      setError(message)
      notify(message, 'error')
      return
    }

    setError('')
    setLoading(true)
    try {
      const result = await validarTicketFacturacion(ticket, code.trim())
      if (!result?.disponible) {
        const message = result?.mensaje || 'Este ticket no se encuentra disponible para facturación.'
        setError(message)
        notify(message, 'error')
        return
      }
      notify(result?.mensaje || 'La compra está disponible para facturación.', 'success')
      onValidated(result)
    } catch (requestError) {
      const message = requestError.message || 'No fue posible validar la compra.'
      setError(message)
      notify(message, 'error')
    } finally {
      setLoading(false)
    }
  }
  return (
    <form className="purchase-form" onSubmit={submit}>
      <Field label="Folio / Ticket de compra" placeholder="Ej. 0000123456" value={ticket} onChange={(e) => setTicket(e.target.value)} icon={Receipt} />
      <Field label="Código de facturación" placeholder="Ej. A7K9-X2P4" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} icon={BadgeCheck} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary full" type="submit" disabled={loading} aria-busy={loading}>
        {loading && <LoaderCircle className="button-spinner" aria-hidden="true" />}
        {loading ? 'Validando compra…' : 'Buscar compra'}
        {!loading && <ArrowRight />}
      </button>
      <div className="info-note"><Info /><p>El código de facturación se encuentra en tu ticket de compra, generalmente en la parte inferior.</p></div>
    </form>
  )
}

function SummaryCard({ purchase, fiscal, title = 'Tu compra', invoice = false }) {
  return (
    <aside className="summary-card">
      <h3>{title}</h3>
      <dl>
        <div><dt>Folio / Ticket de compra</dt><dd>{purchase.ticket}</dd></div>
        <div><dt>Código de facturación</dt><dd>{purchase.code}</dd></div>
        <div><dt>Fecha de compra</dt><dd>{purchase.date}</dd></div>
        {!invoice && <div><dt>Total</dt><dd>{formatCurrency(purchase.total)}</dd></div>}
      </dl>
      {invoice && <><hr /><dl><div><dt>Datos fiscales</dt><dd>{fiscal.name}<br />{fiscal.rfc}<br />{fiscal.cfdi}</dd></div></dl></>}
      <div className="info-note compact"><Info /><p>{invoice ? 'Al generar tu CFDI, lo recibirás en el correo electrónico proporcionado.' : 'Verifica que tus datos sean correctos. Si la información es incorrecta, no podremos generar tu factura.'}</p></div>
    </aside>
  )
}

function FiscalStep({ purchase, data, setData, onBack, onNext, onLogin, notify }) {
  const [regimenes, setRegimenes] = useState([])
  const [usosCfdi, setUsosCfdi] = useState([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)
  const [emailErrors, setEmailErrors] = useState({ email: '', confirmEmail: '' })
  const update = (key) => (e) => setData({ ...data, [key]: e.target.value })
  const updateEmail = (key) => (event) => {
    setData({ ...data, [key]: event.target.value })
    setEmailErrors((current) => ({ ...current, [key]: '' }))
  }

  useEffect(() => {
    let active = true

    Promise.all([obtenerRegimenesFiscales(), obtenerUsosCfdi()])
      .then(([regimenData, usoData]) => {
        if (!active) return
        const normalize = (items) => items
          .map((item) => {
            const id = item.id ?? item.Id
            const clave = item.clave ?? item.Clave
            const descripcion = item.descripcion ?? item.Descripcion
            const label = `${clave} - ${descripcion}`
            return { id, value: label, label }
          })
        setRegimenes(normalize(regimenData))
        setUsosCfdi(normalize(usoData))
      })
      .catch((error) => {
        if (active) notify(error.message || 'No fue posible cargar los catálogos del SAT.', 'error')
      })
      .finally(() => {
        if (active) setLoadingCatalogs(false)
      })

    return () => { active = false }
  }, [notify])

  useEffect(() => {
    const normalizedRfc = data.rfc
      .trim()
      .replace(/[\s-]/g, '')
      .toUpperCase()

    if (![12, 13].includes(normalizedRfc.length)) return undefined

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        const entity = await consultarEntidadFiscal(normalizedRfc, controller.signal)
        if (!entity) return

        const regimen = entity.regimen ?? entity.Regimen
        const regimenClave = regimen?.clave ?? regimen?.Clave
        const regimenDescripcion = regimen?.descripcion ?? regimen?.Descripcion
        const correo = entity.correo ?? entity.Correo ?? ''

        setData((current) => {
          const currentRfc = current.rfc.trim().replace(/[\s-]/g, '').toUpperCase()
          if (currentRfc !== normalizedRfc) return current

          return {
            ...current,
            entityFiscalId: entity.id ?? entity.Id ?? null,
            rfc: entity.rfc ?? entity.RFC ?? normalizedRfc,
            name: entity.razonSocial ?? entity.RazonSocial ?? '',
            zip: entity.codigoPostal ?? entity.CodigoPostal ?? '',
            regime: regimenClave && regimenDescripcion
              ? `${regimenClave} - ${regimenDescripcion}`
              : current.regime,
            regimeId: entity.regimenID ?? entity.regimenId ?? entity.RegimenID ?? regimen?.id ?? regimen?.Id ?? current.regimeId,
            email: correo,
            confirmEmail: correo,
          }
        })
        setEmailErrors({ email: '', confirmEmail: '' })
      } catch (error) {
        if (error.name !== 'AbortError') {
          notify(error.message || 'No fue posible consultar la entidad fiscal.', 'error')
        }
      }
    }, 500)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [data.rfc, notify, setData])

  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault()
      const requiredFields = [data.rfc, data.name, data.zip, data.regime, data.cfdi, data.email, data.confirmEmail]
      if (requiredFields.some((value) => !value.trim()) || !data.regimeId || !data.cfdiId) {
        const missingFields = [
          !data.regime && 'un régimen fiscal',
          !data.cfdi && 'un uso del CFDI',
        ].filter(Boolean)
        notify(
          missingFields.length > 0
            ? `Completa todos los datos fiscales y selecciona ${missingFields.join(' y ')} para continuar.`
            : 'Completa todos los datos fiscales para continuar.',
          'error',
        )
        return
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const normalizedEmail = data.email.trim().toLocaleLowerCase('es-MX')
      const normalizedConfirmation = data.confirmEmail.trim().toLocaleLowerCase('es-MX')

      if (!emailPattern.test(normalizedEmail) || !emailPattern.test(normalizedConfirmation)) {
        const errors = {
          email: emailPattern.test(normalizedEmail) ? '' : 'Ingresa una dirección de correo electrónico válida.',
          confirmEmail: emailPattern.test(normalizedConfirmation) ? '' : 'Ingresa una confirmación de correo válida.',
        }
        setEmailErrors(errors)
        notify(errors.email || errors.confirmEmail, 'error')
        return
      }

      if (normalizedEmail !== normalizedConfirmation) {
        const message = 'Las direcciones de correo electrónico no coinciden.'
        setEmailErrors({ email: '', confirmEmail: message })
        notify(message, 'error')
        return
      }

      setEmailErrors({ email: '', confirmEmail: '' })
      setData({ ...data, email: data.email.trim(), confirmEmail: data.confirmEmail.trim() })
      onNext()
    }}>
      <div className="split-layout">
        <section className="form-section">
          <div className="section-heading"><span><User /></span><div><h2>Datos fiscales</h2><p>Ingresa la información que aparecerá en tu factura.</p></div><button type="button" className="text-button" onClick={onLogin}><User /> Usar mis datos guardados</button></div>
          <div className="fields-grid">
            <Field
              label="RFC *"
              value={data.rfc}
              onChange={(event) => setData({
                ...data,
                entityFiscalId: null,
                rfc: event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 13),
              })}
              autoComplete="off"
              inputMode="text"
              maxLength={13}
              pattern="[A-Za-z0-9]{12,13}"
              title="El RFC debe contener únicamente letras y números."
              required
            />
            <Field
              label="Nombre o razón social *"
              value={data.name}
              onChange={(event) => setData({ ...data, name: event.target.value.toLocaleUpperCase('es-MX') })}
              style={{ textTransform: 'uppercase' }}
              required
              className="wide"
            />
            <Field label="Código postal *" value={data.zip} onChange={update('zip')} required />
            <SearchableSelect label="Régimen fiscal *" value={data.regime} onChange={(value) => { const option = regimenes.find((item) => item.value === value); setData({ ...data, regime: value, regimeId: option?.id ?? null }) }} options={regimenes} placeholder="Buscar régimen fiscal" loading={loadingCatalogs} required />
            <SearchableSelect label="Uso del CFDI *" value={data.cfdi} onChange={(value) => { const option = usosCfdi.find((item) => item.value === value); setData({ ...data, cfdi: value, cfdiId: option?.id ?? null }) }} options={usosCfdi} placeholder="Buscar uso del CFDI" loading={loadingCatalogs} required />
            <Field label="Correo electrónico *" type="email" value={data.email} onChange={updateEmail('email')} error={emailErrors.email} required />
            <Field label="Confirmar correo electrónico *" type="email" value={data.confirmEmail} onChange={updateEmail('confirmEmail')} error={emailErrors.confirmEmail} required />
          </div>
        </section>
        <SummaryCard purchase={purchase} fiscal={data} />
      </div>
      <div className="actions"><button type="button" className="button ghost" onClick={onBack}><ArrowLeft /> Volver</button><button className="button primary" type="submit">Continuar <ArrowRight /></button></div>
    </form>
  )
}

function ReviewStep({ purchase, data, onBack, onEdit, onGenerate, generating, error }) {
  return (
    <>
      <div className="split-layout review-layout">
        <section>
          <div className="section-heading"><span><FileText /></span><div><h2>Revisa tu información</h2><p>Verifica que todos los datos sean correctos antes de generar tu factura.</p></div><button className="text-button" onClick={onEdit}>Editar datos</button></div>
          <div className="review-card"><h3><Receipt /> Datos de compra</h3><dl className="detail-grid"><div><dt>Folio / Ticket de compra</dt><dd>{purchase.ticket}</dd></div><div><dt>Código de facturación</dt><dd>{purchase.code}</dd></div><div><dt>Fecha de compra</dt><dd>{purchase.date}</dd></div></dl></div>
          <div className="review-card"><h3><User /> Datos fiscales</h3><dl className="detail-grid fiscal-details"><div><dt>Nombre</dt><dd>{data.name}</dd></div><div><dt>RFC</dt><dd>{data.rfc}</dd></div><div><dt>Código postal</dt><dd>{data.zip}</dd></div><div><dt>Régimen fiscal</dt><dd>{data.regime}</dd></div><div><dt>Uso del CFDI</dt><dd>{data.cfdi}</dd></div><div><dt>Correo electrónico</dt><dd>{data.email}</dd></div></dl></div>
        </section>
        <div><SummaryCard purchase={purchase} fiscal={data} title="Tu factura" invoice /><button className="button primary full generate" onClick={onGenerate} disabled={generating} aria-busy={generating}>{generating ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <FileText />} {generating ? 'Generando CFDI…' : 'Generar CFDI'} {!generating && <ArrowRight />}</button>{error && <p className="form-error" role="alert">{error}</p>}</div>
      </div>
      <div className="actions single"><button className="button ghost" onClick={onBack}><ArrowLeft /> Volver</button></div>
    </>
  )
}

function SuccessStep({ purchase, data, invoice, onReset }) {
  return (
    <div className="success-grid">
      <section className="success-card">
        <span className="success-icon"><Check /></span>
        <h2>¡Factura generada con éxito!</h2>
        <p>Tu CFDI ha sido generado correctamente y se ha enviado a tu correo electrónico.</p>
        <div className="download-row"><button className="button primary"><FileText /> Descargar PDF <Download /></button><button className="button outline"><FileText /> Descargar XML <Download /></button></div>
        <div className="info-note email-note"><Mail /><p>También hemos enviado una copia de tu factura a:<br /><strong>{data.email}</strong></p></div>
        <button className="button outline reset" onClick={onReset}><RefreshCw /> Generar otra factura</button>
      </section>
      <aside className="summary-card final-summary"><h3>Resumen de tu factura</h3><dl><div><dt>Folio / Ticket de compra</dt><dd>{purchase.ticket}</dd></div><div><dt>Código de facturación</dt><dd>{purchase.code}</dd></div><div><dt>Fecha de compra</dt><dd>{purchase.date}</dd></div></dl><hr /><dl><div><dt>RFC</dt><dd>{data.rfc}</dd></div><div><dt>Nombre o razón social</dt><dd>{data.name}</dd></div><div><dt>Uso del CFDI</dt><dd>{data.cfdi}</dd></div></dl><hr /><dl><div><dt>Folio fiscal (UUID)</dt><dd>{invoice.uuid}</dd></div><div><dt>Serie y folio</dt><dd>{invoice.serie}{invoice.folio}</dd></div><div><dt>Fecha de timbrado</dt><dd>{formatDate(invoice.fechaTimbrado)}</dd></div><div><dt>Total</dt><dd><strong>{formatCurrency(invoice.total)}</strong></dd></div></dl><div className="info-note compact"><Info /><p>Tus archivos estarán disponibles por 30 días para que puedas descargarlos nuevamente.</p></div></aside>
    </div>
  )
}

function LoginView({ onBack, onLogin }) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <main className="scene login-scene">
      <div className="site-shell login-wrap">
        <button className="back-link" onClick={onBack}><ArrowLeft /> Volver a Autofacturación</button>
        <div className="login-card">
          <form className="login-form" onSubmit={(e) => { e.preventDefault(); onLogin() }}>
            <img src="/assets/logo-sayer.png" alt="Sayer" />
            <h1>Inicia sesión</h1><p>Accede a tu cuenta para usar tus datos fiscales guardados y facturar más rápido.</p>
            <Field label="Correo electrónico" type="email" placeholder="tu@correo.com" icon={Mail} required />
            <label className="field"><span>Contraseña</span><div><Lock size={21} /><input type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu contraseña" required /><button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
            <div className="login-options"><label><input type="checkbox" defaultChecked /> Mantener mi sesión activa</label><a href="#recuperar">¿Olvidaste tu contraseña?</a></div>
            <button className="button primary full">Iniciar sesión</button>
            <div className="divider"><span>o continúa con</span></div>
            <div className="provider-row"><button type="button" className="button outline">G&nbsp; Continuar con Google</button><button type="button" className="button outline">●&nbsp; Continuar con Apple</button></div>
            <p className="signup">¿No tienes una cuenta? <a href="#registro">Crear cuenta</a></p>
          </form>
          <aside className="login-benefits"><h2>Tus datos fiscales,<br />siempre a la mano</h2><div><FileCheck2 /><p><strong>Factura más rápido</strong><span>Usa tus datos fiscales guardados en segundos.</span></p></div><div><ShieldCheck /><p><strong>Tus datos están seguros</strong><span>Protegemos tu información personal.</span></p></div><div><Clock3 /><p><strong>Disponible en todos tus dispositivos</strong><span>Accede desde donde estés.</span></p></div></aside>
        </div>
      </div>
    </main>
  )
}

function App() {
  const [step, setStep] = useState(1)
  const [login, setLogin] = useState(false)
  const [purchase, setPurchase] = useState(emptyPurchase)
  const [fiscal, setFiscal] = useState(createEmptyFiscal)
  const [invoice, setInvoice] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])
  const notify = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
  }, [])
  const handlePurchaseValidated = (result) => {
    setPurchase({
      ticket: String(result.folio),
      code: result.codigoFacturacion,
      date: formatDate(result.fechaEmision),
      total: result.total,
    })
    setStep(2)
  }
  const resetFlow = () => {
    setPurchase(emptyPurchase)
    setFiscal(createEmptyFiscal())
    setInvoice(null)
    setGenerationError('')
    setStep(1)
  }
  const handleGenerate = async () => {
    if (generating) return

    setGenerating(true)
    setGenerationError('')
    try {
      const entityPayload = fiscal.entityFiscalId
        ? { entidadFiscalId: fiscal.entityFiscalId, entidadFiscal: null }
        : {
            entidadFiscalId: null,
            entidadFiscal: {
              regimenId: fiscal.regimeId,
              razonSocial: fiscal.name,
              rfc: fiscal.rfc,
              codigoPostal: fiscal.zip,
              correo: fiscal.email,
            },
          }
      const result = await generarFactura({
        folio: Number(purchase.ticket),
        codigoFacturacion: purchase.code,
        usoCfdiId: fiscal.cfdiId,
        correo: fiscal.email,
        ...entityPayload,
      })

      setInvoice(result)
      notify(result.mensaje || 'Factura generada correctamente.', 'success')
      setStep(4)
    } catch (error) {
      const message = error.message || 'No fue posible generar la factura.'
      setGenerationError(message)
      notify(message, 'error')
    } finally {
      setGenerating(false)
    }
  }
  const content = useMemo(() => {
    if (step === 1) return <PurchaseStep onValidated={handlePurchaseValidated} notify={notify} />
    if (step === 2) return <FiscalStep purchase={purchase} data={fiscal} setData={setFiscal} onBack={() => setStep(1)} onNext={() => { setGenerationError(''); setStep(3) }} onLogin={() => setLogin(true)} notify={notify} />
    if (step === 3) return <ReviewStep purchase={purchase} data={fiscal} onBack={() => setStep(2)} onEdit={() => setStep(2)} onGenerate={handleGenerate} generating={generating} error={generationError} />
    return invoice ? <SuccessStep purchase={purchase} data={fiscal} invoice={invoice} onReset={resetFlow} /> : null
  }, [step, purchase, fiscal, invoice, generating, generationError, notify])

  return (
    <div className="app">
      <Header />
      <Toast toast={toast} onClose={closeToast} />
      {login ? <LoginView onBack={() => setLogin(false)} onLogin={() => setLogin(false)} /> : (
        <main className={`scene step-${step}`}>
          <div className="site-shell scene-content">
            <Hero step={step} />
            <section className="flow-card">
              {step < 4 && <Stepper current={step} />}
              {content}
            </section>
          </div>
        </main>
      )}
      {!login && step === 1 && <section className="benefit-strip"><div className="site-shell"><div><Clock3 /><p><strong>Rápido y seguro</strong><span>Factura en minutos, sin filas.</span></p></div><div><ShieldCheck /><p><strong>Información protegida</strong><span>Tus datos están seguros con nosotros.</span></p></div><div><FileCheck2 /><p><strong>CFDI válido</strong><span>Generado con todos los requisitos del SAT.</span></p></div></div></section>}
      <Footer />
    </div>
  )
}

export default App
