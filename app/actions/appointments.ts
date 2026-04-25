'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getAppointments(start: Date, end: Date) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: start,
          lte: end,
        },
      },
      include: {
        client: true,
      },
    })
    return { success: true, data: appointments }
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    const msg = (error?.message || '').toString()
    const isDbDown =
      error?.code === 'P1001' ||
      error?.name === 'PrismaClientInitializationError' ||
      msg.includes("Can't reach database server")
    return { success: false, error: isDbDown ? 'No se pudo conectar a la base de datos.' : 'Error al obtener los turnos.' }
  }
}

export async function createAppointment(data: {
  startTime: Date
  duration: number // in minutes
  clientId?: number
  newClient?: {
    name: string
    phone?: string
    licensePlate?: string
  }
  reason: string
  description?: string
}) {
  try {
    let clientId = data.clientId
    if (!clientId) {
      const rawName = (data.newClient?.name || '').toString().trim()
      if (!rawName) {
        return { success: false, error: 'El nombre del cliente es obligatorio.' }
      }

      const rawPlate = (data.newClient?.licensePlate || '').toString().trim()
      const licensePlate = rawPlate ? rawPlate.toUpperCase() : null
      const phone = (data.newClient?.phone || '').toString().trim() || null

      const existing = licensePlate
        ? await prisma.client.findUnique({ where: { licensePlate } })
        : null

      const client =
        existing ||
        (await prisma.client.create({
          data: {
            name: rawName,
            phone,
            licensePlate,
          },
        }))

      clientId = client.id
    }

    const endTime = new Date(data.startTime.getTime() + data.duration * 60000)

    const appointment = await prisma.appointment.create({
      data: {
        startTime: data.startTime,
        endTime: endTime,
        clientId,
        reason: data.reason,
        description: data.description,
      },
    })

    revalidatePath('/')
    revalidatePath('/appointments')
    revalidatePath('/clients')
    return { success: true, data: appointment }
  } catch (error) {
    console.error('Error creating appointment:', error)
    return { success: false, error: 'Error al crear el turno' }
  }
}

export async function deleteAppointment(id: number) {
  try {
    await prisma.appointment.delete({
      where: { id },
    })
    revalidatePath('/')
    revalidatePath('/appointments')
    return { success: true }
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return { success: false, error: 'Error al eliminar el turno' }
  }
}
