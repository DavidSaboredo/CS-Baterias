import { login } from '@/app/actions'
import { getPrimaryButtonClasses } from '@/lib/button-styles'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full z-0">
        <img 
          src="/Banner.png" 
          alt="Background" 
          className="w-full h-full object-cover opacity-100"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-10" />

      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md relative z-20">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="CS Audio Logo" 
              className="h-32 w-auto object-contain" 
              style={{ maxHeight: '128px', width: 'auto' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CS Audio/Baterías</h1>
          <p className="text-gray-600">Iniciar sesión</p>
        </div>
        
        <form action={login} className="space-y-6">
          {error === 'true' && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Usuario o contraseña incorrectos.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              name="username"
              required
              className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingrese su usuario"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingrese su contraseña"
            />
          </div>

          <button
            type="submit"
            className={getPrimaryButtonClasses({ color: 'blue', fullWidth: true })}
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}
