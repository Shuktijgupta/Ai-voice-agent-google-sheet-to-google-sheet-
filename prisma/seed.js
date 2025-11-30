const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const drivers = [
        { name: 'John Doe', phone: '555-0101', status: 'new' },
        { name: 'Jane Smith', phone: '555-0102', status: 'new' },
        { name: 'Mike Johnson', phone: '555-0103', status: 'new' },
    ]

    for (const driver of drivers) {
        await prisma.driver.create({
            data: driver,
        })
    }

    console.log('Seeding completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
