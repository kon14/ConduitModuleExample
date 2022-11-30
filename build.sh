rm -rf ./src/proto
mkdir -p ./src/proto

# Verify Proto Compiler Exists
if ! command -v protoc >> /dev/null 2>&1
then
    echo "Missing Protocol Buffers Compiler (protoc)"
    echo "https://grpc.io/docs/protoc-installation/"
    exit -1
fi

# Generate Code
echo "Generating TypeScript code from Proto..."
protoc \
  --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_opt=esModuleInterop=true \
  --ts_proto_opt=outputServices=generic-definitions,useExactTypes=false \
  --ts_proto_out=src/proto/ \
  ./src/service.proto
