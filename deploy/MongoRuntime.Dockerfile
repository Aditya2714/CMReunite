# MongoDB 7 remains the database engine for compatibility. The upstream image
# bundles administration binaries that are not needed by the runtime service and
# were compiled with vulnerable Go dependencies. Production tools live in the
# separate patched MongoTools image.
FROM mongo:7

RUN rm -f \
      /usr/local/bin/gosu \
      /usr/bin/bsondump \
      /usr/bin/mongodump \
      /usr/bin/mongoexport \
      /usr/bin/mongofiles \
      /usr/bin/mongoimport \
      /usr/bin/mongorestore \
      /usr/bin/mongostat \
      /usr/bin/mongotop \
      /js-yaml.js \
    && rm -rf /opt/js-yaml \
    && chown -R mongodb:mongodb /data /docker-entrypoint-initdb.d

USER 999:999
