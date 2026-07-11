const config = {
  _id: 'rs0',
  members: [{ _id: 0, host: 'mongodb:27017' }]
};

try {
  rs.status();
} catch (_error) {
  rs.initiate(config);
}

for (let attempt = 0; attempt < 30; attempt += 1) {
  if (db.hello().isWritablePrimary) {
    print('Replica Set rs0 pronto para escrita.');
    quit(0);
  }

  sleep(1000);
}

throw new Error('Replica Set rs0 não ficou pronto dentro de 30 segundos.');
