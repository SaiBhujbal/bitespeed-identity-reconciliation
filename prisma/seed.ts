import { reconcile } from './../src/services/contactService';
import { prisma } from '../src/db.js';

async function main() {
  await reconcile('lorraine@hillvalley.edu', '123456');
  await reconcile('mcfly@hillvalley.edu', '123456');
  await reconcile('george@hillvalley.edu', '919191');
  await reconcile('biffsucks@hillvalley.edu', '717171');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
