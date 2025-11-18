import { Entity, Column, PrimaryColumn, Index } from "typeorm";

@Entity()
export class Sentence {
  @PrimaryColumn()
  uuid!: string;

  @Column()
  createdAt!: Date;

  @Column()
  submitted!: boolean;

  @Column()
  viewed!: boolean;

  @Index()
  @Column()
  content!: string;

  // Metadata fields (JSON stored as text)
  // Array of {timestamp, latitude, longitude} for each occurrence
  @Column({ type: "text", nullable: true })
  metadata?: string;

  // Source app name (Grid, Dasher, etc.)
  @Column({ nullable: true })
  source?: string;
}
