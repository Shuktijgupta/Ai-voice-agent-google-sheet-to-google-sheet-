import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const latestCall = await prisma.call.findFirst({
        orderBy: {
            startTime: 'desc',
        },
        where: {
            blandCallId: { not: null }
        },
        include: {
            driver: true
        }
    });

    if (latestCall) {
        console.log('Latest Call ID:', latestCall.blandCallId);
        console.log('Status:', latestCall.status);
        console.log('Start Time:', latestCall.startTime);
        console.log('Driver External ID:', latestCall.driver?.externalId);
    } else {
        console.log('No calls found with Bland Call ID.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
