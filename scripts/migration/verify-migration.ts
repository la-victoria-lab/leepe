import { createClient } from '@supabase/supabase-js'

// Nueva base de datos
const newSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function verifyMigration() {
  console.log('🔍 Verificando migración a la nueva base de datos...\n')

  let allGood = true

  try {
    // Test 1: Verificar conexión
    console.log('Test 1: Verificando conexión...')
    const { error: pingError } = await newSupabase.from('libros').select('count').limit(1)

    if (pingError && pingError.code === '42P01') {
      console.log('⚠️  La tabla "libros" no existe aún. ¿Ya ejecutaste init-database.sql?')
      allGood = false
    } else if (pingError) {
      console.log('❌ Error de conexión:', pingError.message)
      allGood = false
    } else {
      console.log('✅ Conexión exitosa\n')
    }

    // Test 2: Listar tablas existentes (nombres correctos: libros, prestamos)
    console.log('Test 2: Listando tablas existentes...')
    const tables = ['libros', 'prestamos']

    for (const table of tables) {
      const { count, error } = await newSupabase.from(table).select('*', { count: 'exact', head: true })

      if (error && error.code === '42P01') {
        console.log(`⚠️  Tabla "${table}" no existe`)
        allGood = false
      } else if (error) {
        console.log(`❌ Error en tabla "${table}":`, error.message)
        allGood = false
      } else {
        console.log(`✅ Tabla "${table}": ${count ?? 0} registros`)
      }
    }

    // Test 3: Verificar vista libros_estado
    console.log('\nTest 3: Verificando vista libros_estado...')
    const { count: vistaCount, error: vistaError } = await newSupabase
      .from('libros_estado')
      .select('*', { count: 'exact', head: true })

    if (vistaError) {
      console.log('⚠️  Vista "libros_estado" no existe o tiene errores:', vistaError.message)
      allGood = false
    } else {
      console.log(`✅ Vista "libros_estado": ${vistaCount ?? 0} registros`)
    }

    // Test 4: Verificar políticas RLS
    console.log('\nTest 4: Verificando políticas RLS...')
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { error: rlsError } = await anonClient.from('libros').select('*').limit(1)

    if (rlsError) {
      console.log('✅ RLS está habilitado correctamente')
    } else {
      console.log('⚠️  RLS podría no estar configurado (o no hay políticas)')
    }

    // Test 5: Verificar autenticación
    console.log('\nTest 5: Verificando configuración de autenticación...')
    console.log('✅ Verifica manualmente en el dashboard de Supabase que Google OAuth esté configurado')
    console.log('   URL: https://supabase.com/dashboard/project/ghnyliwownuinqvnvhvg/auth/providers')
  } catch (error) {
    console.error('\n❌ Error general:', error)
    allGood = false
  }

  console.log('\n' + '='.repeat(50))
  if (allGood) {
    console.log('✅ ¡Migración verificada exitosamente!')
    console.log('Puedes proceder a probar la aplicación.')
  } else {
    console.log('⚠️  Hay algunos problemas que debes revisar.')
    console.log('Consulta SETUP_GUIDE.md para más detalles.')
  }
  console.log('='.repeat(50))
}

verifyMigration()
