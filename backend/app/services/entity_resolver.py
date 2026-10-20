from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.entity import PartyModel, PartyAliasModel

class EntityResolverService:
    @staticmethod
    async def resolve_or_create_party(
        organization_id: str,
        name: str,
        source_system: str,
        gstin: str | None = None,
        pan: str | None = None,
        bank_account: str | None = None,
        upi_id: str | None = None,
        db: AsyncSession = Depends(None) # Session passed explicitly
    ) -> PartyModel:
        """
        CONCEPT: DETERMINISTIC ENTITY RESOLUTION (F5)
        Resolves messy system names to a single canonical Party using GSTIN, PAN, or exact alias.
        """
        cleaned_name = name.strip().upper()

        # 1. Check if an alias already exists for this exact name in this source system
        alias_result = await db.execute(
            select(PartyAliasModel).where(
                PartyAliasModel.organization_id == organization_id,
                PartyAliasModel.alias_name == cleaned_name,
                PartyAliasModel.source_system == source_system
            )
        )
        existing_alias = alias_result.scalars().first()
        if existing_alias:
            # Return the canonical party linked to this alias
            party_result = await db.execute(select(PartyModel).where(PartyModel.id == existing_alias.party_id))
            return party_result.scalars().first()

        # 2. Check by immutable government identifier (GSTIN or PAN)
        party = None
        if gstin:
            gstin_clean = gstin.strip().upper()
            res = await db.execute(select(PartyModel).where(PartyModel.organization_id == organization_id, PartyModel.gstin == gstin_clean))
            party = res.scalars().first()
        
        if not party and pan:
            pan_clean = pan.strip().upper()
            res = await db.execute(select(PartyModel).where(PartyModel.organization_id == organization_id, PartyModel.pan == pan_clean))
            party = res.scalars().first()

        # 3. If no party found, create a new canonical Party master record
        if not party:
            party = PartyModel(
                organization_id=organization_id,
                name=cleaned_name,
                gstin=gstin.strip().upper() if gstin else None,
                pan=pan.strip().upper() if pan else None,
                bank_account=bank_account.strip() if bank_account else None,
                upi_id=upi_id.strip() if upi_id else None
            )
            db.add(party)
            await db.flush() # Flush to acquire party.id

        # 4. Register this name as an alias for future instant lookups
        alias = PartyAliasModel(
            organization_id=organization_id,
            party_id=party.id,
            alias_name=cleaned_name,
            source_system=source_system,
            confidence_score=1.00
        )
        db.add(alias)
        await db.commit()
        await db.refresh(party)

        return party