#include <iostream>
#include <napi.h>
#include <unordered_map>
#include <enet/enet.h>

#define NCP const Napi::CallbackInfo& info

ENetHost* host;
Napi::FunctionReference emit;
int port;
unsigned int connectID = 0;
std::unordered_map<unsigned int, ENetPeer*> peers;

void Finalizer(Napi::Env env, uint8_t* data) {
	delete[] data; // free created data by C++
}

void js_init(NCP) {
		
	auto env = info.Env();
	port = info[0].As<Napi::Number>().Uint32Value();
		
	if (enet_initialize())
		return Napi::Error::New(env, "ENet Failed to Initialize").ThrowAsJavaScriptException();

	std::cout << "ENet Initialized with Port: " << port << std::endl;
}

void js_set_event_emitter(NCP) {
	auto func = info[0].As<Napi::Function>();

	emit = Napi::Persistent(func);
	std::cout << "Event Emitter Set" << std::endl;
}

void js_host_create(NCP) {
	ENetAddress address;
	address.port = port;
	address.host = ENET_HOST_ANY;

	host = enet_host_create(&address,
		1024,
		2,
		0,
		0);

	// set some compression that gt uses
	host->checksum = enet_crc32;
	enet_host_compress_with_range_coder(host);

	std::cout << "ENet Host created." << std::endl;
}

void js_host_event_recieve(NCP) {
	auto env = info.Env();
	ENetEvent event;

	if (enet_host_service(host, &event, 0) > 0) {
		switch (event.type) {
			case ENET_EVENT_TYPE_CONNECT: {
				unsigned int connID = connectID++;

				// copy connectID to peer data
				event.peer->data = new uint8_t[sizeof(int)];
				memcpy(event.peer->data, &connID, sizeof(int));

				peers[connID] = event.peer;

				emit.Call({
					Napi::String::New(env, "connect"),
					Napi::Number::New(env, connID)
				});

				break;
			}
	
			case ENET_EVENT_TYPE_RECEIVE: {
				auto data = new uint8_t[event.packet->dataLength];
				memcpy(data, event.packet->data, event.packet->dataLength);

				auto buffer = Napi::Buffer<uint8_t>::New(env, data, event.packet->dataLength, Finalizer);
				emit.Call({
					Napi::String::New(env, "receive"),
					Napi::Number::New(env, *(unsigned int*)event.peer->data),
					buffer
				});

				enet_packet_destroy(event.packet);
				break;
			}

			case ENET_EVENT_TYPE_DISCONNECT: {
				auto connID	= *(unsigned int*)event.peer->data;
				auto key = connID;

				emit.Call({
					Napi::String::New(env, "disconnect"),
					Napi::Number::New(env, connID)
				});

				if (peers.find(key) != peers.end())
					peers.erase(key);

				delete[] event.peer->data;
				break;
			}
		}
	}
}

void js_send_packet(NCP) {
	auto buf = info[0].As<Napi::Buffer<uint8_t>>();
	auto connectIDFromJS = info[1].As<Napi::Number>().Uint32Value();

	auto bytes = buf.Data();
	auto peer = peers[connectIDFromJS];

	if (!peer) return;

	auto packet = enet_packet_create(bytes, buf.Length(), ENET_PACKET_FLAG_RELIABLE);

	enet_peer_send(peer, 0, packet);
}

void js_send_multiple_packets(NCP) {
	auto packets 				 = info[0].ToObject();
	auto count	 				 = info[1].As<Napi::Number>().Uint32Value();
	auto connectIDFromJS = info[2].As<Napi::Number>().Uint32Value();

	// peers
	auto peer = peers[connectIDFromJS];

	if (!peer) return;

	for (int i = 0; i < count; ++i) {
		auto buffer = packets.Get(i).As<Napi::Buffer<uint8_t>>();
		auto packet = enet_packet_create(buffer.Data(), buffer.Length(), ENET_PACKET_FLAG_RELIABLE);

		enet_peer_send(peer, 0, packet);
	}
}

void js_peer_disconnect(NCP) {
	auto type = info[0].As<Napi::Number>().Uint32Value();
	auto connectIDFromJS = info[1].As<Napi::Number>().Uint32Value();
	auto key = connectIDFromJS;

	if (peers.find(key) != peers.end()) {
		auto peer	= peers[key];

		switch (type) {
			case 0: {
				enet_peer_disconnect(peer, 0);
				break;
			}

			case 1: {
				enet_peer_disconnect_now(peer, 0);
				break;
			}

			case 2: {
				enet_peer_disconnect_later(peer, 0);
				break;
			}
		}
	}
}

bool js_is_connected(NCP) {
	auto connectIDFromJS = info[0].As<Napi::Number>().Uint32Value();
	auto peer						 = peers[connectIDFromJS];

	return peer &&
					peer.state == ENET_PEER_STATE_CONNECTED
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	exports["init"] 							= Napi::Function::New(env, js_init);
	exports["set_event_emitter"] 	= Napi::Function::New(env, js_set_event_emitter);
	exports["host_create"] 				= Napi::Function::New(env, js_host_create);
	exports["host_event_recieve"] = Napi::Function::New(env, js_host_event_recieve);
	exports["send_packet"] 				= Napi::Function::New(env, js_send_packet);
	exports["peer_disconnect"] 		= Napi::Function::New(env, js_peer_disconnect);
	exports["send_multiple"]			= Napi::Function::New(env, js_send_multiple_packets);
	exports["is_connected"]				= Napi::Function::New(env, js_is_connected);

	return exports;
}

NODE_API_MODULE(Core, Init)