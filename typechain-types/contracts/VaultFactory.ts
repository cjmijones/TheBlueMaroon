/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "../common";

export interface VaultFactoryInterface extends Interface {
  getFunction(
    nameOrSignature: "createVault" | "implementation" | "predictVault"
  ): FunctionFragment;

  getEvent(nameOrSignatureOrTopic: "VaultCreated"): EventFragment;

  encodeFunctionData(
    functionFragment: "createVault",
    values: [AddressLike, BigNumberish, BigNumberish, string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "implementation",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "predictVault",
    values: [AddressLike, BigNumberish, AddressLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "createVault",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "implementation",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "predictVault",
    data: BytesLike
  ): Result;
}

export namespace VaultCreatedEvent {
  export type InputTuple = [
    vault: AddressLike,
    nft: AddressLike,
    tokenId: BigNumberish,
    shares: BigNumberish,
    creator: AddressLike
  ];
  export type OutputTuple = [
    vault: string,
    nft: string,
    tokenId: bigint,
    shares: bigint,
    creator: string
  ];
  export interface OutputObject {
    vault: string;
    nft: string;
    tokenId: bigint;
    shares: bigint;
    creator: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface VaultFactory extends BaseContract {
  connect(runner?: ContractRunner | null): VaultFactory;
  waitForDeployment(): Promise<this>;

  interface: VaultFactoryInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  createVault: TypedContractMethod<
    [
      nft: AddressLike,
      tokenId: BigNumberish,
      shares: BigNumberish,
      name_: string,
      symbol_: string
    ],
    [string],
    "nonpayable"
  >;

  implementation: TypedContractMethod<[], [string], "view">;

  predictVault: TypedContractMethod<
    [nft: AddressLike, tokenId: BigNumberish, creator: AddressLike],
    [string],
    "view"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "createVault"
  ): TypedContractMethod<
    [
      nft: AddressLike,
      tokenId: BigNumberish,
      shares: BigNumberish,
      name_: string,
      symbol_: string
    ],
    [string],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "implementation"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "predictVault"
  ): TypedContractMethod<
    [nft: AddressLike, tokenId: BigNumberish, creator: AddressLike],
    [string],
    "view"
  >;

  getEvent(
    key: "VaultCreated"
  ): TypedContractEvent<
    VaultCreatedEvent.InputTuple,
    VaultCreatedEvent.OutputTuple,
    VaultCreatedEvent.OutputObject
  >;

  filters: {
    "VaultCreated(address,address,uint256,uint256,address)": TypedContractEvent<
      VaultCreatedEvent.InputTuple,
      VaultCreatedEvent.OutputTuple,
      VaultCreatedEvent.OutputObject
    >;
    VaultCreated: TypedContractEvent<
      VaultCreatedEvent.InputTuple,
      VaultCreatedEvent.OutputTuple,
      VaultCreatedEvent.OutputObject
    >;
  };
}
